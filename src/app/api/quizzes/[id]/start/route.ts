/**
 * POST /api/quizzes/:id/start - Start quiz attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthFromRequest } from '@/lib/auth/middleware';
import type { Question } from '@/lib/quiz/types';
import { randomUUID } from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${randomUUID().replace(/-/g, '')}`;
}

/**
 * POST /api/quizzes/:id/start
 * Starts a quiz attempt for the authenticated user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    
    // Authenticate user
    const authResult = await getAuthFromRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const walletAddress = authResult.user.address;
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Wallet address required' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Fetch quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: 'QUIZ_NOT_FOUND', message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Check quiz is active
    if (quiz.status !== 'active') {
      return NextResponse.json(
        { error: 'QUIZ_CLOSED', message: 'Quiz is not active' },
        { status: 410 }
      );
    }

    // Check winner limit not reached
    if (quiz.current_winners >= quiz.winner_limit) {
      return NextResponse.json(
        { error: 'QUIZ_CLOSED', message: 'Quiz has reached winner limit' },
        { status: 410 }
      );
    }

    // Check for existing attempt (prevent duplicate)
    const { data: existingAttempt } = await supabase
      .from('attempts')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('wallet_address', walletAddress)
      .single();

    if (existingAttempt) {
      return NextResponse.json(
        { error: 'ALREADY_ATTEMPTED', message: 'You have already attempted this quiz' },
        { status: 409 }
      );
    }

    // Parse and randomize questions
    const questionsJson = quiz.questions_json as unknown as { questions: Question[] };
    const questions = questionsJson?.questions || [];
    const shuffledQuestions = shuffleArray(questions);

    // Create session
    const sessionId = generateSessionId();
    const serverTime = Date.now();

    // Create attempt record
    const { error: attemptError } = await supabase
      .from('attempts')
      .insert({
        quiz_id: quizId,
        wallet_address: walletAddress,
        user_fid: authResult.user.fid || null,
        session_id: sessionId,
        start_time: new Date().toISOString(),
        total_questions: questions.length,
        status: 'active',
      });

    if (attemptError) {
      console.error('Error creating attempt:', attemptError);
      
      // Check if it's a duplicate key error
      if (attemptError.code === '23505') {
        return NextResponse.json(
          { error: 'ALREADY_ATTEMPTED', message: 'You have already attempted this quiz' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to start quiz' },
        { status: 500 }
      );
    }

    // Return session with questions (without correct answers)
    const questionsWithoutAnswers = shuffledQuestions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options,
    }));

    return NextResponse.json({
      sessionId,
      questions: questionsWithoutAnswers,
      timePerQuestion: quiz.time_per_question,
      serverTime,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/quizzes/:id/start:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
