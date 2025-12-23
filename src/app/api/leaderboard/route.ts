/**
 * GET /api/leaderboard - Get global leaderboard
 * Shows top players across all quizzes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || 'NEYNAR_API_DOCS';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  username: string | null;
  fid: number | null;
  pfpUrl: string | null;
  totalWins: number;
  totalRewards: number;
  totalAttempts: number;
  avgCompletionTime: number | null;
  bestRank: number;
}

// Lookup Farcaster users by wallet addresses (batch)
async function lookupUsersByAddresses(addresses: string[]): Promise<Map<string, { fid: number; username: string; pfpUrl: string }>> {
  const result = new Map<string, { fid: number; username: string; pfpUrl: string }>();
  if (addresses.length === 0) return result;

  try {
    // Neynar supports up to 350 addresses per request
    const batchSize = 100;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const response = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${batch.join(',')}`,
        {
          headers: {
            'accept': 'application/json',
            'api_key': NEYNAR_API_KEY,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Response format: { "0x123...": [{ fid, username, ... }], ... }
        for (const [addr, users] of Object.entries(data)) {
          const userArray = users as { fid: number; username: string; pfp_url: string }[];
          if (userArray && userArray.length > 0) {
            const user = userArray[0];
            result.set(addr.toLowerCase(), {
              fid: user.fid,
              username: user.username,
              pfpUrl: user.pfp_url,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Neynar lookup error:', error);
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const period = searchParams.get('period') || 'all'; // all, week, month

    const supabase = createServerClient();

    // Build date filter
    let dateFilter: string | null = null;
    if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = weekAgo.toISOString();
    } else if (period === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = monthAgo.toISOString();
    }

    // Get winners aggregated by wallet
    let winnersQuery = supabase
      .from('winners')
      .select('wallet_address, rank, reward_amount, completion_time_ms, created_at');
    
    if (dateFilter) {
      winnersQuery = winnersQuery.gte('created_at', dateFilter);
    }

    const { data: winners, error: winnersError } = await winnersQuery;

    if (winnersError) {
      console.error('Error fetching winners:', winnersError);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    // Get attempts count per wallet
    let attemptsQuery = supabase
      .from('attempts')
      .select('wallet_address, id, created_at');
    
    if (dateFilter) {
      attemptsQuery = attemptsQuery.gte('created_at', dateFilter);
    }

    const { data: attempts } = await attemptsQuery;

    // Aggregate by wallet
    const walletStats = new Map<string, {
      totalWins: number;
      totalRewards: number;
      totalAttempts: number;
      completionTimes: number[];
      bestRank: number;
    }>();

    // Process winners
    for (const winner of winners || []) {
      const wallet = winner.wallet_address?.toLowerCase();
      if (!wallet) continue;

      const existing = walletStats.get(wallet) || {
        totalWins: 0,
        totalRewards: 0,
        totalAttempts: 0,
        completionTimes: [],
        bestRank: Infinity,
      };

      existing.totalWins += 1;
      existing.totalRewards += winner.reward_amount || 0;
      if (winner.completion_time_ms) {
        existing.completionTimes.push(winner.completion_time_ms);
      }
      if (winner.rank < existing.bestRank) {
        existing.bestRank = winner.rank;
      }

      walletStats.set(wallet, existing);
    }

    // Process attempts
    const attemptCounts = new Map<string, number>();
    for (const attempt of attempts || []) {
      const wallet = attempt.wallet_address?.toLowerCase();
      if (!wallet) continue;
      attemptCounts.set(wallet, (attemptCounts.get(wallet) || 0) + 1);
    }

    // Merge attempt counts
    for (const [wallet, count] of attemptCounts) {
      const existing = walletStats.get(wallet);
      if (existing) {
        existing.totalAttempts = count;
      } else {
        walletStats.set(wallet, {
          totalWins: 0,
          totalRewards: 0,
          totalAttempts: count,
          completionTimes: [],
          bestRank: Infinity,
        });
      }
    }

    // Convert to array and sort by wins, then rewards
    const preliminaryLeaderboard = Array.from(walletStats.entries())
      .map(([wallet, stats]) => ({
        rank: 0,
        walletAddress: wallet,
        username: null as string | null,
        fid: null as number | null,
        pfpUrl: null as string | null,
        totalWins: stats.totalWins,
        totalRewards: stats.totalRewards,
        totalAttempts: stats.totalAttempts,
        avgCompletionTime: stats.completionTimes.length > 0
          ? Math.round(stats.completionTimes.reduce((a, b) => a + b, 0) / stats.completionTimes.length)
          : null,
        bestRank: stats.bestRank === Infinity ? 0 : stats.bestRank,
      }))
      .filter(entry => entry.totalWins > 0 || entry.totalAttempts > 0)
      .sort((a, b) => {
        // Sort by wins first, then by rewards
        if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
        return b.totalRewards - a.totalRewards;
      })
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    // Lookup Farcaster usernames for all wallet addresses
    const walletAddresses = preliminaryLeaderboard.map(e => e.walletAddress);
    const userMap = await lookupUsersByAddresses(walletAddresses);

    // Merge user info into leaderboard
    const leaderboard: LeaderboardEntry[] = preliminaryLeaderboard.map(entry => {
      const userInfo = userMap.get(entry.walletAddress.toLowerCase());
      return {
        ...entry,
        username: userInfo?.username || null,
        fid: userInfo?.fid || null,
        pfpUrl: userInfo?.pfpUrl || null,
      };
    });

    return NextResponse.json({
      leaderboard,
      period,
      totalPlayers: walletStats.size,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
