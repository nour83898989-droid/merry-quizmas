/**
 * POST /api/rewards/claim-all - Update multiple rewards after onchain claims
 * 
 * IMPORTANT: This route expects the frontend to have already executed
 * the onchain transactions. It only updates the database with real txHashes.
 * 
 * For onchain claims, use:
 * 1. Frontend calls claimRewardOnChain() for each reward
 * 2. Wait for tx confirmations
 * 3. Call this API with the real txHashes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthFromRequest } from '@/lib/auth/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ClaimAllRequest {
  claims: Array<{
    rewardId: string;
    txHash: string;
  }>;
}

export async function POST(request: NextRequest) {
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
    const body: ClaimAllRequest = await request.json();
    const { claims } = body;

    if (!claims || claims.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Claims array required' },
        { status: 400 }
      );
    }

    // Validate all txHashes
    for (const claim of claims) {
      if (!claim.txHash || !claim.txHash.startsWith('0x')) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: `Invalid txHash for reward ${claim.rewardId}` },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();
    const claimedAt = new Date().toISOString();
    let successCount = 0;
    let failCount = 0;

    // Update each claim with its real txHash
    for (const claim of claims) {
      const { error: updateError } = await supabase
        .from('reward_claims')
        .update({
          status: 'claimed',
          tx_hash: claim.txHash,
          claimed_at: claimedAt,
        })
        .eq('id', claim.rewardId)
        .eq('wallet_address', walletAddress);

      if (updateError) {
        console.error(`Failed to update claim ${claim.rewardId}:`, updateError);
        failCount++;
      } else {
        successCount++;
      }
    }

    // Also update winners table
    const rewardIds = claims.map(c => c.rewardId);
    const { data: rewardClaims } = await supabase
      .from('reward_claims')
      .select('quiz_id')
      .in('id', rewardIds);

    if (rewardClaims) {
      const quizIds = [...new Set(rewardClaims.map(c => c.quiz_id))];
      for (const quizId of quizIds) {
        const claimForQuiz = claims.find(c => 
          rewardClaims.some(rc => rc.quiz_id === quizId && rewardIds.includes(c.rewardId))
        );
        if (claimForQuiz) {
          await supabase
            .from('winners')
            .update({ tx_hash: claimForQuiz.txHash })
            .eq('quiz_id', quizId)
            .eq('wallet_address', walletAddress);
        }
      }
    }

    return NextResponse.json({
      success: true,
      claimedCount: successCount,
      failedCount: failCount,
      message: `Successfully updated ${successCount} claims`,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/rewards/claim-all:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
