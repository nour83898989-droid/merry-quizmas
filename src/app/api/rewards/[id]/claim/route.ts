/**
 * POST /api/rewards/:id/claim - Update reward status after onchain claim
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthFromRequest } from '@/lib/auth/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ClaimRequest {
  txHash: string;
}

/**
 * POST /api/rewards/:id/claim
 * Updates reward status to claimed after successful onchain transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    if (!body.txHash) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Transaction hash required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Update reward_claims table
    const { data: claim, error: claimError } = await supabase
      .from('reward_claims')
      .update({
        status: 'claimed',
        claim_tx_hash: body.txHash,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('wallet_address', walletAddress)
      .select()
      .single();

    if (claimError) {
      // Try updating winners table as fallback
      const winnerId = id.replace('winner-', '');
      const { error: winnerError } = await supabase
        .from('winners')
        .update({
          claimed: true,
          claim_tx_hash: body.txHash,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', winnerId)
        .eq('wallet_address', walletAddress);

      if (winnerError) {
        console.error('Error updating claim status:', claimError, winnerError);
        return NextResponse.json(
          { error: 'INTERNAL_ERROR', message: 'Failed to update claim status' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Claim status updated',
      txHash: body.txHash,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/rewards/:id/claim:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
