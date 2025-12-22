/**
 * GET /api/profile/stats - Get user profile statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Wallet required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const walletLower = wallet.toLowerCase();

    // Get total attempts
    const { count: totalAttempts } = await supabase
      .from('attempts')
      .select('id', { count: 'exact' })
      .eq('wallet_address', walletLower);

    // Get total wins
    const { count: totalWins } = await supabase
      .from('winners')
      .select('id', { count: 'exact' })
      .eq('wallet_address', walletLower);

    // Get total rewards
    const { data: rewards } = await supabase
      .from('winners')
      .select('reward_amount')
      .eq('wallet_address', walletLower);

    const totalRewards = rewards?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0;

    return NextResponse.json({
      totalAttempts: totalAttempts || 0,
      totalWins: totalWins || 0,
      totalRewards: totalRewards.toLocaleString(),
    });
  } catch (error) {
    console.error('Profile stats error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
