/**
 * GET /api/quizzes/:id - Get quiz details (without correct answers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getTokenDisplayName } from '@/lib/web3/config';
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
  reward_token_address?: string;
  remaining_spots: number;
  total_spots: number;
  ends_at: string | null;
  stake_required: { token: string; amount: string } | null;
  questions: {
    id: string;
    text: string;
    options: string[];
    imageUrl?: string | null;
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
  // Fun quiz and image fields
  is_fun_quiz: boolean;
  cover_image_url: string | null;
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
    const { data: quizData, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !quizData) {
      return NextResponse.json(
        { error: 'QUIZ_NOT_FOUND', message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Cast to include new fields (migration adds these columns)
    const quiz = quizData as typeof quizData & {
      is_fun_quiz?: boolean | null;
      cover_image_url?: string | null;
    };

    // Parse questions and remove correct answers
    const questionsJson = quiz.questions_json as unknown as { questions: Question[] };
    const questionsWithoutAnswers = (questionsJson?.questions || []).map(q => ({
      id: q.id,
      text: q.text,
      options: q.options,
      imageUrl: (q as Question & { imageUrl?: string }).imageUrl || null,
      // correctIndex is intentionally excluded
    }));

    const isFunQuiz = quiz.is_fun_quiz === true;
    // Fun quiz has unlimited spots (-1 means unlimited)
    const remainingSpots = isFunQuiz ? -1 : (quiz.winner_limit - (quiz.current_winners || 0));
    const rewardPerWinner = !isFunQuiz && quiz.winner_limit > 0
      ? (BigInt(quiz.reward_amount) / BigInt(quiz.winner_limit)).toString()
      : '0';

    // Parse reward pools
    const rewardPools = isFunQuiz ? [] : ((quiz.reward_pools as {
      tier: number;
      name: string;
      winnerCount: number;
      percentage: number;
    }[]) || [
      { tier: 1, name: 'Speed Champions', winnerCount: 100, percentage: 70 },
      { tier: 2, name: 'Fast Finishers', winnerCount: 900, percentage: 30 },
    ]);

    const response: QuizDetail = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      question_count: questionsWithoutAnswers.length,
      time_per_question: quiz.time_per_question,
      reward_per_winner: rewardPerWinner,
      reward_token: isFunQuiz ? '' : getTokenDisplayName(quiz.reward_token),
      reward_token_address: isFunQuiz ? undefined : quiz.reward_token,
      remaining_spots: remainingSpots, // -1 means unlimited for fun quiz
      total_spots: isFunQuiz ? -1 : quiz.winner_limit, // -1 means unlimited for fun quiz
      ends_at: quiz.end_time,
      stake_required: !isFunQuiz && quiz.stake_token && quiz.stake_amount
        ? { token: quiz.stake_token, amount: quiz.stake_amount.toString() }
        : null,
      questions: questionsWithoutAnswers,
      reward_pools: rewardPools,
      total_pool_amount: isFunQuiz ? '0' : String(quiz.total_pool_amount ?? quiz.reward_amount),
      entry_fee: isFunQuiz ? null : (quiz.entry_fee || null),
      entry_fee_token: isFunQuiz ? null : (quiz.entry_fee_token || null),
      contract_quiz_id: isFunQuiz ? null : (quiz.contract_quiz_id || null),
      is_fun_quiz: isFunQuiz,
      cover_image_url: quiz.cover_image_url || null,
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
