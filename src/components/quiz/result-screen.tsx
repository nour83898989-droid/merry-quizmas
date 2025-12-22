'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getTokenDisplayName } from '@/lib/web3/config';

interface ResultScreenProps {
  isWinner: boolean;
  score: number;
  totalQuestions: number;
  completionTimeMs: number;
  rewardAmount?: string;
  rewardToken?: string;
  rank?: number;
  onShare?: () => void;
  onViewLeaderboard?: () => void;
  onPlayAgain?: () => void;
}

export function ResultScreen({
  isWinner,
  score,
  totalQuestions,
  completionTimeMs,
  rewardAmount,
  rewardToken,
  rank,
  onShare,
  onViewLeaderboard,
  onPlayAgain,
}: ResultScreenProps) {
  const [showConfetti, setShowConfetti] = useState(isWinner);

  useEffect(() => {
    if (!isWinner) return;
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [isWinner]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}.${Math.floor((ms % 1000) / 100)}s`;
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
      {/* Confetti animation for winners */}
      {showConfetti && <Confetti />}

      {/* Result icon */}
      <div 
        className={`
          w-24 h-24 rounded-full flex items-center justify-center mb-6
          ${isWinner ? 'bg-success/20' : 'bg-error/20'}
          animate-bounce-once
        `}
      >
        {isWinner ? (
          <TrophyIcon className="w-12 h-12 text-success" />
        ) : (
          <XCircleIcon className="w-12 h-12 text-error" />
        )}
      </div>

      {/* Title */}
      <h1 
        className={`
          text-3xl font-bold mb-2
          ${isWinner ? 'text-success' : 'text-error'}
        `}
      >
        {isWinner ? 'Congratulations!' : 'Better luck next time!'}
      </h1>

      <p className="text-foreground-muted mb-8 text-center">
        {isWinner 
          ? 'You answered all questions correctly!' 
          : `You got ${score} out of ${totalQuestions} correct.`
        }
      </p>

      {/* Stats cards */}
      <div className="w-full max-w-sm space-y-4 mb-8">
        <Card className="flex justify-between items-center">
          <span className="text-foreground-muted">Score</span>
          <span className="text-xl font-bold text-foreground">
            {score}/{totalQuestions}
          </span>
        </Card>

        <Card className="flex justify-between items-center">
          <span className="text-foreground-muted">Time</span>
          <span className="text-xl font-bold text-foreground">
            {formatTime(completionTimeMs)}
          </span>
        </Card>

        {isWinner && rank && (
          <Card className="flex justify-between items-center">
            <span className="text-foreground-muted">Rank</span>
            <span className="text-xl font-bold text-primary">
              #{rank}
            </span>
          </Card>
        )}

        {isWinner && rewardAmount && (
          <Card className="flex justify-between items-center bg-success/10 border-success/30">
            <span className="text-success">Reward</span>
            <span className="text-xl font-bold text-success">
              {rewardAmount} {rewardToken ? getTokenDisplayName(rewardToken) : 'tokens'}
            </span>
          </Card>
        )}
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-sm space-y-3">
        {isWinner && onShare && (
          <Button onClick={onShare} fullWidth>
            Share Result
          </Button>
        )}
        
        {onViewLeaderboard && (
          <Button onClick={onViewLeaderboard} variant="outline" fullWidth>
            View Leaderboard
          </Button>
        )}
        
        {onPlayAgain && (
          <Button onClick={onPlayAgain} variant="ghost" fullWidth>
            Play Another Quiz
          </Button>
        )}
      </div>
    </div>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 3h14v2h-1v1a5 5 0 01-2.757 4.472A3.5 3.5 0 0112 14.5a3.5 3.5 0 01-3.243-4.028A5 5 0 016 6V5H5V3zm3 2v1a3 3 0 003 3h2a3 3 0 003-3V5H8zm4 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 5h8v2H8v-2z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Pre-generate confetti positions to avoid impure function calls during render
const CONFETTI_ITEMS = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  left: `${(i * 2) % 100}%`,
  backgroundColor: ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5],
  animationDelay: `${(i * 0.04) % 2}s`,
  animationDuration: `${2 + (i * 0.04) % 2}s`,
}));

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {CONFETTI_ITEMS.map((item) => (
        <div
          key={item.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: item.left,
            top: '-10px',
            backgroundColor: item.backgroundColor,
            animationDelay: item.animationDelay,
            animationDuration: item.animationDuration,
          }}
        />
      ))}
    </div>
  );
}
