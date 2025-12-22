/**
 * POST /api/rewards/claim - Claim a single reward
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthFromRequest } from '@/lib/auth/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ClaimRequest {
  rewardId: string;
  amount: string;
}

/**
 * POST /api/rewards/claim
 * Process a reward claim
 * 
 * Note: In production, this would:
 * 1. Verify the claim is valid
 * 2. Generate a signature for the smart contract
 * 3. Or directly send tokens from treasury wallet
 * 
 * For now, we simulate the claim and update the database
 */
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
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Reward ID required' },
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

    // In production, here you would:
    // 1. Call smart contract to transfer tokens
    // 2. Or use a treasury wallet to send tokens
    // 3. Get the transaction hash
    
    // For now, we simulate with a mock tx hash
    const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

    // Update claim status
    const { error: updateError } = await supabase
      .from('reward_claims')
      .update({
        status: 'claimed',
        tx_hash: mockTxHash,
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
      .update({ tx_hash: mockTxHash })
      .eq('quiz_id', claim.quiz_id)
      .eq('wallet_address', walletAddress);

    return NextResponse.json({
      success: true,
      txHash: mockTxHash,
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
