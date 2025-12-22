/**
 * GET /api/quizzes/:id - Get quiz details (without correct answers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import type { Question } from '@/lib/quiz/types';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface QuizDetail {
  id: string;
  title: string;
  description: string | null;
  question_count: number;
  time_per_question: number;
  reward_per_winner: string;
  reward_token: string;
  remaining_spots: number;
  total_spots: number;
  ends_at: string | null;
  stake_required: { token: string; amount: string } | null;
  questions: {
    id: string;
    text: string;
    options: string[];
  }[];
  reward_pools: {
    tier: number;
    name: string;
    winnerCount: number;
    percentage: number;
  }[];
  total_pool_amount: string;
  entry_fee: string | null;
  entry_fee_token: string | null;
  contract_quiz_id: string | null;
}

/**
 * GET /api/quizzes/:id
 * Returns quiz details without correct answers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Fetch quiz by ID
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !quiz) {
      return NextResponse.json(
        { error: 'QUIZ_NOT_FOUND', message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Parse questions and remove correct answers
    const questionsJson = quiz.questions_json as unknown as { questions: Question[] };
    const questionsWithoutAnswers = (questionsJson?.questions || []).map(q => ({
      id: q.id,
      text: q.text,
      options: q.options,
      // correctIndex is intentionally excluded
    }));

    const remainingSpots = quiz.winner_limit - (quiz.current_winners || 0);
    const rewardPerWinner = quiz.winner_limit > 0
      ? (BigInt(quiz.reward_amount) / BigInt(quiz.winner_limit)).toString()
      : '0';

    // Parse reward pools
    const quizData = quiz as typeof quiz & {
      reward_pools?: unknown;
      total_pool_amount?: string;
      entry_fee?: string;
      entry_fee_token?: string;
      contract_quiz_id?: string;
    };
    
    const rewardPools = (quizData.reward_pools as {
      tier: number;
      name: string;
      winnerCount: number;
      percentage: number;
    }[]) || [
      { tier: 1, name: 'Speed Champions', winnerCount: 100, percentage: 70 },
      { tier: 2, name: 'Fast Finishers', winnerCount: 900, percentage: 30 },
    ];

    const response: QuizDetail = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      question_count: questionsWithoutAnswers.length,
      time_per_question: quiz.time_per_question,
      reward_per_winner: rewardPerWinner,
      reward_token: quiz.reward_token,
      remaining_spots: remainingSpots,
      total_spots: quiz.winner_limit,
      ends_at: quiz.end_time,
      stake_required: quiz.stake_token && quiz.stake_amount
        ? { token: quiz.stake_token, amount: quiz.stake_amount }
        : null,
      questions: questionsWithoutAnswers,
      reward_pools: rewardPools,
      total_pool_amount: quizData.total_pool_amount?.toString() || quiz.reward_amount,
      entry_fee: quizData.entry_fee || null,
      entry_fee_token: quizData.entry_fee_token || null,
      contract_quiz_id: quizData.contract_quiz_id || null,
    };

    return NextResponse.json({ quiz: response });
  } catch (error) {
    console.error('Unexpected error in GET /api/quizzes/:id:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
