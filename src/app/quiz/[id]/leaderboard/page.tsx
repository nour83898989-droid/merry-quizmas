'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  username?: string;
  fid?: number;
  pfpUrl?: string;
  completionTimeMs: number;
  rewardAmount: string;
}

interface LeaderboardData {
  quizTitle: string;
  entries: LeaderboardEntry[];
  totalWinners: number;
  rewardToken: string;
}

export default function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quizzes/${id}/leaderboard`);
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  const truncateWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface rounded w-1/2" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-surface rounded" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="text-center">
          <p className="text-error mb-4">{error || 'Failed to load leaderboard'}</p>
          <Button variant="outline" onClick={() => router.push('/quizzes')}>
            Back to Quizzes
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm px-4 py-4 border-b border-foreground/10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/quizzes')}>
            <BackIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Leaderboard</h1>
            <p className="text-sm text-foreground-muted">{data.quizTitle}</p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="p-4">
        <Card className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{data.totalWinners}</p>
            <p className="text-xs text-foreground-muted">Winners</p>
          </div>
          <div className="w-px bg-foreground/10" />
          <div>
            <p className="text-2xl font-bold text-success">{data.rewardToken}</p>
            <p className="text-xs text-foreground-muted">Reward Token</p>
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <div className="px-4 space-y-2">
        {data.entries.length === 0 ? (
          <Card className="text-center py-8">
            <TrophyIcon className="w-12 h-12 text-foreground-muted mx-auto mb-3" />
            <p className="text-foreground-muted">No winners yet</p>
            <p className="text-sm text-foreground-muted">Be the first to complete this quiz!</p>
          </Card>
        ) : (
          data.entries.map((entry, index) => (
            <LeaderboardRow
              key={entry.wallet}
              entry={entry}
              isTop3={index < 3}
              formatTime={formatTime}
              truncateWallet={truncateWallet}
              rewardToken={data.rewardToken}
            />
          ))
        )}
      </div>
    </main>
  );
}

function LeaderboardRow({
  entry,
  isTop3,
  formatTime,
  truncateWallet,
  rewardToken,
}: {
  entry: LeaderboardEntry;
  isTop3: boolean;
  formatTime: (ms: number) => string;
  truncateWallet: (wallet: string) => string;
  rewardToken: string;
}) {
  const getRankStyle = () => {
    switch (entry.rank) {
      case 1: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 2: return 'bg-gray-400/20 text-gray-400 border-gray-400/30';
      case 3: return 'bg-amber-600/20 text-amber-600 border-amber-600/30';
      default: return 'bg-surface text-foreground-muted border-foreground/10';
    }
  };

  // Display name: username > truncated wallet
  const displayName = entry.username ? `@${entry.username}` : truncateWallet(entry.wallet);
  // Show FID if available
  const fidDisplay = entry.fid ? `FID: ${entry.fid}` : null;

  return (
    <Card 
      className={`flex items-center gap-3 ${isTop3 ? 'border-2' : ''}`}
      style={isTop3 ? { borderColor: entry.rank === 1 ? '#EAB308' : entry.rank === 2 ? '#9CA3AF' : '#D97706' } : {}}
    >
      {/* Rank */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getRankStyle()}`}>
        {entry.rank <= 3 ? (
          <TrophyIcon className="w-5 h-5" />
        ) : (
          entry.rank
        )}
      </div>

      {/* User info with PFP */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {entry.pfpUrl ? (
          <img 
            src={entry.pfpUrl} 
            alt={entry.username || 'User'} 
            className="w-8 h-8 rounded-full object-cover border border-foreground/20"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
            <span className="text-xs text-foreground-muted">👤</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">
            {displayName}
          </p>
          <p className="text-xs text-foreground-muted">
            {formatTime(entry.completionTimeMs)}
            {fidDisplay && <span className="ml-2 opacity-60">• {fidDisplay}</span>}
          </p>
        </div>
      </div>

      {/* Reward */}
      <div className="text-right">
        <p className="font-semibold text-success">{entry.rewardAmount}</p>
        <p className="text-xs text-foreground-muted">{rewardToken}</p>
      </div>
    </Card>
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
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 3h14v2h-1v1a5 5 0 01-2.757 4.472A3.5 3.5 0 0112 14.5a3.5 3.5 0 01-3.243-4.028A5 5 0 016 6V5H5V3zm3 2v1a3 3 0 003 3h2a3 3 0 003-3V5H8zm4 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 5h8v2H8v-2z" />
    </svg>
  );
}
