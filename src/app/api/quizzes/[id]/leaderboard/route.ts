/**
 * GET /api/quizzes/:id/leaderboard - Get quiz leaderboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  username: string | null;
  completionTimeMs: number;
  rewardAmount: number;
}

/**
 * GET /api/quizzes/:id/leaderboard
 * Returns winners ordered by completion time (fastest first)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    const supabase = createServerClient();

    // Verify quiz exists and get quiz info
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, reward_token, current_winners')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: 'QUIZ_NOT_FOUND', message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Fetch winners ordered by completion time
    const { data: winners, error: winnersError } = await supabase
      .from('winners')
      .select('*')
      .eq('quiz_id', quizId)
      .order('completion_time_ms', { ascending: true })
      .order('created_at', { ascending: true });

    if (winnersError) {
      console.error('Error fetching leaderboard:', winnersError);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Transform to response format
    const entries: LeaderboardEntry[] = (winners || []).map((winner, index) => ({
      rank: index + 1,
      wallet: winner.wallet_address,
      username: winner.username,
      completionTimeMs: winner.completion_time_ms,
      rewardAmount: winner.reward_amount,
    }));

    return NextResponse.json({ 
      quizTitle: quiz.title,
      entries,
      totalWinners: quiz.current_winners || entries.length,
      rewardToken: quiz.reward_token,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/quizzes/:id/leaderboard:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
