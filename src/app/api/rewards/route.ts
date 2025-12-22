/**
 * GET /api/rewards - Get claimable rewards for a wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthFromRequest } from '@/lib/auth/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ClaimableReward {
  id: string;
  quizId: string;
  quizTitle: string;
  amount: string;
  token: string;
  rank: number;
  poolTier: number;
  rankInPool: number;
  completedAt: string;
  status: string;
  contractQuizId?: string;
}

/**
 * GET /api/rewards
 * Returns claimable rewards for the authenticated wallet
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await getAuthFromRequest(request);
    if (!authResult.isAuthenticated || !authResult.user?.address) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Wallet address required' },
        { status: 401 }
      );
    }

    const walletAddress = authResult.user.address;
    const supabase = createServerClient();

    // Fetch reward claims with quiz info
    const { data: claims, error } = await supabase
      .from('reward_claims')
      .select(`
        id,
        quiz_id,
        pool_tier,
        rank_in_pool,
        reward_amount,
        status,
        created_at,
        quizzes (
          title,
          reward_token,
          contract_quiz_id
        )
      `)
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rewards:', error);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to fetch rewards' },
        { status: 500 }
      );
    }

    // Also fetch from winners table for backward compatibility
    const { data: winners } = await supabase
      .from('winners')
      .select(`
        id,
        quiz_id,
        rank,
        reward_amount,
        created_at,
        quizzes (
          title,
          reward_token,
          contract_quiz_id
        )
      `)
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false });

    // Combine and deduplicate
    const rewardMap = new Map<string, ClaimableReward>();

    // Add from reward_claims
    for (const claim of claims || []) {
      const quiz = claim.quizzes as { title: string; reward_token: string; contract_quiz_id?: string } | null;
      rewardMap.set(claim.id, {
        id: claim.id,
        quizId: claim.quiz_id,
        quizTitle: quiz?.title || 'Unknown Quiz',
        amount: claim.reward_amount,
        token: quiz?.reward_token || 'tokens',
        rank: 0, // Will be updated from winners
        poolTier: claim.pool_tier,
        rankInPool: claim.rank_in_pool,
        completedAt: claim.created_at,
        status: claim.status,
        contractQuizId: quiz?.contract_quiz_id || undefined,
      });
    }

    // Update with winner info
    for (const winner of winners || []) {
      const quiz = winner.quizzes as { title: string; reward_token: string; contract_quiz_id?: string } | null;
      const existingClaim = Array.from(rewardMap.values()).find(
        r => r.quizId === winner.quiz_id
      );
      
      if (existingClaim) {
        existingClaim.rank = winner.rank;
      } else {
        // Add from winners table if not in claims
        rewardMap.set(`winner-${winner.id}`, {
          id: `winner-${winner.id}`,
          quizId: winner.quiz_id,
          quizTitle: quiz?.title || 'Unknown Quiz',
          amount: winner.reward_amount,
          token: quiz?.reward_token || 'tokens',
          rank: winner.rank,
          poolTier: 0,
          rankInPool: 0,
          completedAt: winner.created_at,
          status: 'pending',
          contractQuizId: quiz?.contract_quiz_id || undefined,
        });
      }
    }

    const rewards = Array.from(rewardMap.values());

    // Calculate totals
    const totalPending = rewards
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

    const totalClaimed = rewards
      .filter(r => r.status === 'claimed')
      .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

    return NextResponse.json({
      rewards,
      summary: {
        totalPending: totalPending.toString(),
        totalClaimed: totalClaimed.toString(),
        pendingCount: rewards.filter(r => r.status === 'pending').length,
        claimedCount: rewards.filter(r => r.status === 'claimed').length,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/rewards:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
