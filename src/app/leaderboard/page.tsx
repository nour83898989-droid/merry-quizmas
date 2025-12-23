'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';

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

type Period = 'all' | 'week' | 'month';

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?period=${period}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setTotalPlayers(data.totalPlayers || 0);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function formatPlayerName(entry: LeaderboardEntry) {
    if (entry.username) {
      return `@${entry.username}`;
    }
    return formatAddress(entry.walletAddress);
  }

  function formatFid(fid: number | null) {
    if (!fid) return null;
    return `FID: ${fid}`;
  }

  function formatTime(ms: number | null) {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
  }

  function getRankEmoji(rank: number) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }

  function getRankStyle(rank: number) {
    if (rank === 1) return 'bg-yellow-500/20 border-yellow-500/50';
    if (rank === 2) return 'bg-gray-400/20 border-gray-400/50';
    if (rank === 3) return 'bg-orange-600/20 border-orange-600/50';
    return '';
  }

  return (
    <ChristmasLayout>
      <main className="min-h-screen pb-20">
        {/* Header */}
        <header className="px-4 py-4 border-b border-foreground/10">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <BackIcon className="w-5 h-5 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-bold">🏆 Leaderboard</h1>
            <div className="w-16" />
          </div>
        </header>

        {/* Period Filter */}
        <div className="px-4 py-3 flex gap-2">
          {(['all', 'month', 'week'] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="flex-1"
            >
              {p === 'all' ? 'All Time' : p === 'month' ? 'This Month' : 'This Week'}
            </Button>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="px-4 py-2">
          <p className="text-sm text-foreground-muted">
            {totalPlayers} players ranked
          </p>
        </div>

        {/* Leaderboard List */}
        <div className="px-4 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <Card className="text-center py-8">
              <TrophyIcon className="w-12 h-12 mx-auto text-foreground-muted mb-3" />
              <p className="text-foreground-muted">No players yet</p>
              <p className="text-sm text-foreground-muted mt-1">
                Be the first to complete a quiz!
              </p>
            </Card>
          ) : (
            leaderboard.map((entry) => (
              <Card
                key={entry.walletAddress}
                className={`flex items-center gap-3 p-3 ${getRankStyle(entry.rank)}`}
              >
                {/* Rank */}
                <div className="w-12 text-center font-bold text-lg">
                  {getRankEmoji(entry.rank)}
                </div>

                {/* Profile Picture */}
                {entry.pfpUrl && (
                  <img 
                    src={entry.pfpUrl} 
                    alt="" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {formatPlayerName(entry)}
                  </p>
                  <div className="flex gap-3 text-xs text-foreground-muted">
                    {entry.fid && <span>FID: {entry.fid}</span>}
                    <span>{entry.totalAttempts} plays</span>
                    {entry.avgCompletionTime && (
                      <span>avg {formatTime(entry.avgCompletionTime)}</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="font-bold text-success">{entry.totalWins} wins</p>
                  {entry.totalRewards > 0 && (
                    <p className="text-xs text-foreground-muted">
                      {entry.totalRewards.toLocaleString()} earned
                    </p>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </ChristmasLayout>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
