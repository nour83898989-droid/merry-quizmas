/**
 * GET /api/quizzes/:id/leaderboard - Get quiz leaderboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getTokenDisplayName } from '@/lib/web3/config';

// Neynar API for user lookup
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || 'NEYNAR_API_DOCS';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  username: string | null;
  fid: number | null;
  pfpUrl: string | null;
  completionTimeMs: number;
  rewardAmount: number;
}

// Lookup user info from FID via Neynar
async function getUserInfoByFid(fid: number): Promise<{ username: string; pfpUrl: string } | null> {
  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const user = data?.users?.[0];
    if (user) {
      return { username: user.username, pfpUrl: user.pfp_url };
    }
    return null;
  } catch {
    return null;
  }
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

    // Transform to response format with user info lookup
    const entries: LeaderboardEntry[] = await Promise.all(
      (winners || []).map(async (winner, index) => {
        let username = winner.username;
        let pfpUrl: string | null = null;
        
        // If we have FID but no username, lookup from Neynar
        if (winner.user_fid && !username) {
          const userInfo = await getUserInfoByFid(winner.user_fid);
          if (userInfo) {
            username = userInfo.username;
            pfpUrl = userInfo.pfpUrl;
          }
        }
        
        return {
          rank: index + 1,
          wallet: winner.wallet_address,
          username,
          fid: winner.user_fid,
          pfpUrl,
          completionTimeMs: winner.completion_time_ms,
          rewardAmount: winner.reward_amount,
        };
      })
    );

    // Convert token address to display name
    const tokenDisplayName = getTokenDisplayName(quiz.reward_token);

    return NextResponse.json({ 
      quizTitle: quiz.title,
      entries,
      totalWinners: quiz.current_winners || entries.length,
      rewardToken: tokenDisplayName,
      rewardTokenAddress: quiz.reward_token,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/quizzes/:id/leaderboard:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
