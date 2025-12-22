/**
 * POST /api/rewards/claim - Update reward status after onchain claim
 * 
 * IMPORTANT: This route expects the frontend to have already executed
 * the onchain transaction. It only updates the database with the real txHash.
 * 
 * For onchain claims, use:
 * 1. Frontend calls claimRewardOnChain() from transactions.ts
 * 2. Wait for tx confirmation
 * 3. Call this API with the real txHash
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthFromRequest } from '@/lib/auth/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ClaimRequest {
  rewardId: string;
  txHash: string; // Real transaction hash from onchain claim
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
    const body: ClaimRequest = await request.json();
    const { rewardId, txHash } = body;

    if (!rewardId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Reward ID required' },
        { status: 400 }
      );
    }

    if (!txHash || !txHash.startsWith('0x')) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Valid transaction hash required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if reward exists and belongs to user
    const { data: claim, error: claimError } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('id', rewardId)
      .eq('wallet_address', walletAddress)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Reward not found' },
        { status: 404 }
      );
    }

    // Check if already claimed
    if (claim.status === 'claimed') {
      return NextResponse.json(
        { error: 'ALREADY_CLAIMED', message: 'Reward already claimed' },
        { status: 409 }
      );
    }

    // Update claim status with real txHash
    const { error: updateError } = await supabase
      .from('reward_claims')
      .update({
        status: 'claimed',
        tx_hash: txHash,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', rewardId);

    if (updateError) {
      console.error('Failed to update claim:', updateError);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to process claim' },
        { status: 500 }
      );
    }

    // Also update winners table if exists
    await supabase
      .from('winners')
      .update({ tx_hash: txHash })
      .eq('quiz_id', claim.quiz_id)
      .eq('wallet_address', walletAddress);

    return NextResponse.json({
      success: true,
      txHash,
      message: 'Reward claimed successfully',
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/rewards/claim:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
