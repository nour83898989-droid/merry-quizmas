/**
 * POST /api/rewards/claim-all - Claim all pending rewards
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthFromRequest } from '@/lib/auth/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ClaimAllRequest {
  rewardIds: string[];
}

/**
 * POST /api/rewards/claim-all
 * Process multiple reward claims at once
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
    const body: ClaimAllRequest = await request.json();
    const { rewardIds } = body;

    if (!rewardIds || rewardIds.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Reward IDs required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch all pending claims for this user
    const { data: claims, error: claimsError } = await supabase
      .from('reward_claims')
      .select('*')
      .in('id', rewardIds)
      .eq('wallet_address', walletAddress)
      .eq('status', 'pending');

    if (claimsError) {
      console.error('Failed to fetch claims:', claimsError);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to fetch claims' },
        { status: 500 }
      );
    }

    if (!claims || claims.length === 0) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'No pending rewards found' },
        { status: 404 }
      );
    }

    // Calculate total amount
    const totalAmount = claims.reduce(
      (sum, claim) => sum + (claim.reward_amount || 0),
      0
    );

    // In production, here you would:
    // 1. Batch transfer tokens via smart contract
    // 2. Or send total amount from treasury
    // 3. Get the transaction hash
    
    // For now, we simulate with a mock tx hash
    const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    const claimedAt = new Date().toISOString();

    // Update all claims
    const claimIds = claims.map(c => c.id);
    const { error: updateError } = await supabase
      .from('reward_claims')
      .update({
        status: 'claimed',
        tx_hash: mockTxHash,
        claimed_at: claimedAt,
      })
      .in('id', claimIds);

    if (updateError) {
      console.error('Failed to update claims:', updateError);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Failed to process claims' },
        { status: 500 }
      );
    }

    // Also update winners table
    const quizIds = [...new Set(claims.map(c => c.quiz_id))];
    for (const quizId of quizIds) {
      await supabase
        .from('winners')
        .update({ tx_hash: mockTxHash })
        .eq('quiz_id', quizId)
        .eq('wallet_address', walletAddress);
    }

    return NextResponse.json({
      success: true,
      txHash: mockTxHash,
      claimedCount: claims.length,
      totalAmount: totalAmount.toString(),
      message: `Successfully claimed ${claims.length} rewards`,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/rewards/claim-all:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
