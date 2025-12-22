/**
 * POST /api/attempts/:sessionId/answer - Submit answer for current question
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthFromRequest } from '@/lib/auth/middleware';
import type { Question, Answer, SessionResult } from '@/lib/quiz/types';
import type { Json } from '@/lib/supabase/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface SubmitAnswerRequest {
  questionId: string;
  selectedIndex: number;
  clientTimestamp: number;
}

/**
 * POST /api/attempts/:sessionId/answer
 * Submits an answer for the current question
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body: SubmitAnswerRequest = await request.json();
    const serverTimestamp = Date.now();

    // Authenticate user
    const authResult = await getAuthFromRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*, quizzes(*)')
      .eq('session_id', sessionId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'SESSION_NOT_FOUND', message: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify wallet matches
    if (attempt.wallet_address !== authResult.user.address) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Session does not belong to this wallet' },
        { status: 401 }
      );
    }

    // Check session is active
    if (attempt.status !== 'active') {
      return NextResponse.json(
        { error: 'SESSION_NOT_FOUND', message: 'Session is no longer active' },
        { status: 404 }
      );
    }

    const quiz = attempt.quizzes as unknown as {
      id: string;
      questions_json: Json;
      time_per_question: number;
      current_winners: number;
      winner_limit: number;
      reward_amount: string;
      reward_pools?: {
        tier: number;
        name: string;
        winnerCount: number;
        percentage: number;
      }[];
    } | null;
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'QUIZ_NOT_FOUND', message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Parse existing answers
    const answersJson = attempt.answers_json as unknown as { answers: Answer[] } | null;
    const existingAnswers: Answer[] = answersJson?.answers || [];

    // Check if question already answered (immutability)
    const alreadyAnswered = existingAnswers.some(a => a.questionId === body.questionId);
    if (alreadyAnswered) {
      return NextResponse.json(
        { error: 'ALREADY_ANSWERED', message: 'This question has already been answered' },
        { status: 409 }
      );
    }

    // Calculate time elapsed since session start
    const sessionStartTime = new Date(attempt.start_time).getTime();
    const questionIndex = existingAnswers.length;
    const timePerQuestion = quiz.time_per_question * 1000; // Convert to ms
    const questionStartTime = sessionStartTime + (questionIndex * timePerQuestion);
    const timeElapsed = serverTimestamp - questionStartTime;

    // Server-side time validation
    if (timeElapsed > timePerQuestion) {
      // Mark as timeout
      const newAnswer: Answer = {
        questionId: body.questionId,
        selectedIndex: -1, // Timeout indicator
        timestamp: body.clientTimestamp,
        serverTimestamp,
      };

      const updatedAnswers = [...existingAnswers, newAnswer];

      await supabase
        .from('attempts')
        .update({
          answers_json: { answers: updatedAnswers } as unknown as Json,
          status: 'timeout',
          end_time: new Date().toISOString(),
        })
        .eq('session_id', sessionId);

      return NextResponse.json(
        { error: 'TIME_EXPIRED', message: 'Time limit exceeded' },
        { status: 408 }
      );
    }

    // Get correct answer from quiz
    const questionsJson = quiz.questions_json as unknown as { questions: Question[] };
    const questions = questionsJson?.questions || [];
    const question = questions.find(q => q.id === body.questionId);

    if (!question) {
      return NextResponse.json(
        { error: 'INVALID_QUESTION', message: 'Question not found' },
        { status: 400 }
      );
    }

    // Check answer correctness (server-side only)
    const isCorrect = body.selectedIndex === question.correctIndex;

    // Create new answer record
    const newAnswer: Answer = {
      questionId: body.questionId,
      selectedIndex: body.selectedIndex,
      timestamp: body.clientTimestamp,
      serverTimestamp,
    };

    const updatedAnswers = [...existingAnswers, newAnswer];
    const isComplete = updatedAnswers.length >= attempt.total_questions;

    // If incorrect, end session
    if (!isCorrect) {
      await supabase
        .from('attempts')
        .update({
          answers_json: { answers: updatedAnswers } as unknown as Json,
          status: 'failed',
          end_time: new Date().toISOString(),
          score: existingAnswers.length, // Score is number of correct answers
        })
        .eq('session_id', sessionId);

      return NextResponse.json({
        correct: false,
        isComplete: true,
        result: {
          sessionId,
          score: existingAnswers.length,
          totalQuestions: attempt.total_questions,
          completionTimeMs: serverTimestamp - sessionStartTime,
          isWinner: false,
        } as SessionResult,
      });
    }

    // If complete and all correct
    if (isComplete) {
      const completionTimeMs = serverTimestamp - sessionStartTime;

      // Check if still within winner limit
      const { data: currentQuiz } = await supabase
        .from('quizzes')
        .select('current_winners, winner_limit, reward_amount, reward_pools')
        .eq('id', quiz.id)
        .single();

      const isWinner = currentQuiz && currentQuiz.current_winners < currentQuiz.winner_limit;
      
      // Calculate reward based on pool tier
      let rewardAmount: string | undefined;
      let poolTier = 0;
      let rankInPool = 0;
      
      if (isWinner && currentQuiz) {
        const newRank = currentQuiz.current_winners + 1;
        const pools = (currentQuiz.reward_pools as {
          tier: number;
          name: string;
          winnerCount: number;
          percentage: number;
        }[]) || [
          { tier: 1, name: 'Speed Champions', winnerCount: 100, percentage: 70 },
          { tier: 2, name: 'Fast Finishers', winnerCount: 900, percentage: 30 },
        ];
        
        // Find which pool this winner belongs to
        let cumulativeWinners = 0;
        for (const pool of pools) {
          const poolStart = cumulativeWinners + 1;
          const poolEnd = cumulativeWinners + pool.winnerCount;
          
          if (newRank >= poolStart && newRank <= poolEnd) {
            poolTier = pool.tier;
            rankInPool = newRank - cumulativeWinners;
            
            // Calculate reward for this pool
            const poolAmount = (BigInt(currentQuiz.reward_amount) * BigInt(pool.percentage)) / BigInt(100);
            rewardAmount = (poolAmount / BigInt(pool.winnerCount)).toString();
            break;
          }
          cumulativeWinners += pool.winnerCount;
        }
        
        // Fallback if no pool found (shouldn't happen)
        if (!rewardAmount) {
          rewardAmount = (BigInt(currentQuiz.reward_amount) / BigInt(currentQuiz.winner_limit)).toString();
        }
      }

      // Update attempt
      await supabase
        .from('attempts')
        .update({
          answers_json: { answers: updatedAnswers } as unknown as Json,
          status: 'completed',
          end_time: new Date().toISOString(),
          completion_time_ms: completionTimeMs,
          score: updatedAnswers.length,
          is_winner: isWinner ?? false,
        })
        .eq('session_id', sessionId);

      // If winner, update quiz and create winner record
      if (isWinner && currentQuiz) {
        const newWinnerCount = currentQuiz.current_winners + 1;

        await supabase
          .from('quizzes')
          .update({ 
            current_winners: newWinnerCount,
            status: newWinnerCount >= currentQuiz.winner_limit ? 'completed' : 'active',
          })
          .eq('id', quiz.id);

        await supabase
          .from('winners')
          .insert({
            quiz_id: quiz.id,
            wallet_address: attempt.wallet_address,
            user_fid: attempt.user_fid,
            rank: newWinnerCount,
            completion_time_ms: completionTimeMs,
            reward_amount: rewardAmount || '0',
          });

        // Also create reward_claims record for tracking
        await supabase
          .from('reward_claims')
          .insert({
            quiz_id: quiz.id,
            wallet_address: attempt.wallet_address,
            user_fid: attempt.user_fid,
            pool_tier: poolTier,
            rank_in_pool: rankInPool,
            reward_amount: rewardAmount || '0',
            status: 'pending',
          });
      }

      return NextResponse.json({
        correct: true,
        isComplete: true,
        result: {
          sessionId,
          score: updatedAnswers.length,
          totalQuestions: attempt.total_questions,
          completionTimeMs,
          isWinner: isWinner || false,
          rewardAmount,
          rank: isWinner ? (currentQuiz?.current_winners || 0) + 1 : undefined,
        } as SessionResult,
      });
    }

    // Update attempt with new answer
    await supabase
      .from('attempts')
      .update({
        answers_json: { answers: updatedAnswers } as unknown as Json,
      })
      .eq('session_id', sessionId);

    // Get next question (without correct answer)
    const nextQuestionIndex = updatedAnswers.length;
    const nextQuestion = questions[nextQuestionIndex];

    return NextResponse.json({
      correct: true,
      isComplete: false,
      nextQuestion: nextQuestion ? {
        id: nextQuestion.id,
        text: nextQuestion.text,
        options: nextQuestion.options,
      } : undefined,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/attempts/:sessionId/answer:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
