'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { getTokenDisplayName } from '@/lib/web3/config';

interface RewardPool {
  tier: number;
  name: string;
  winnerCount: number;
  percentage: number;
}

interface QuizCardProps {
  id: string;
  title: string;
  description?: string | null;
  questionCount: number;
  rewardPerWinner: string;
  rewardToken?: string;
  remainingSpots: number;
  totalSpots?: number;
  endsAt?: string | null;
  stakeRequired?: { token: string; amount: string } | null;
  rewardPools?: RewardPool[];
  totalPoolAmount?: string;
  entryFee?: string | null;
  onClick?: () => void;
}

export function QuizCard({
  title,
  description,
  questionCount,
  rewardPerWinner,
  rewardToken = 'tokens',
  remainingSpots,
  totalSpots,
  endsAt,
  stakeRequired,
  rewardPools,
  totalPoolAmount,
  entryFee,
  onClick,
}: QuizCardProps) {
  const [now, setNow] = useState(() => Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isLimitedSpots = totalSpots && remainingSpots <= totalSpots * 0.2;
  const isEndingSoon = useMemo(() => {
    return endsAt && new Date(endsAt).getTime() - now < 2 * 60 * 60 * 1000;
  }, [endsAt, now]);

  return (
    <Card 
      variant="interactive" 
      onClick={onClick}
      className="relative overflow-hidden"
    >
      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-2">
        {isLimitedSpots && (
          <span className="px-2 py-1 text-xs font-medium bg-warning/20 text-warning rounded-full">
            {remainingSpots} spots left
          </span>
        )}
        {isEndingSoon && (
          <span className="px-2 py-1 text-xs font-medium bg-error/20 text-error rounded-full animate-pulse">
            Ending soon
          </span>
        )}
        {stakeRequired && (
          <span className="px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
            Stake required
          </span>
        )}
      </div>

      {/* Content */}
      <div className="pr-24">
        <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-foreground-muted mb-4 line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-foreground/10">
        <div className="flex items-center gap-2">
          <QuestionIcon className="w-4 h-4 text-foreground-muted" />
          <span className="text-sm text-foreground-muted">
            {questionCount} questions
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <CoinIcon className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-success">
            {totalPoolAmount || rewardPerWinner} {rewardToken ? getTokenDisplayName(rewardToken) : 'tokens'}
          </span>
        </div>

        {entryFee && (
          <div className="flex items-center gap-1">
            <span className="text-xs px-1.5 py-0.5 bg-warning/20 text-warning rounded">
              💰 {entryFee} entry
            </span>
          </div>
        )}

        {!isLimitedSpots && remainingSpots > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <UsersIcon className="w-4 h-4 text-foreground-muted" />
            <span className="text-sm text-foreground-muted">
              {remainingSpots} spots
            </span>
          </div>
        )}
      </div>

      {/* Reward Pools Preview */}
      {rewardPools && rewardPools.length > 0 && (
        <div className="mt-3 pt-3 border-t border-foreground/10">
          <div className="flex items-center gap-2 mb-2">
            <TrophyIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground-muted">Reward Tiers</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {rewardPools.slice(0, 2).map((pool) => (
              <span 
                key={pool.tier} 
                className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
              >
                {pool.name}: {pool.winnerCount} winners ({pool.percentage}%)
              </span>
            ))}
            {rewardPools.length > 2 && (
              <span className="text-xs text-foreground-muted">
                +{rewardPools.length - 2} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Countdown timer for ending soon */}
      {isEndingSoon && endsAt && (
        <div className="mt-3 pt-3 border-t border-foreground/10">
          <CountdownTimer endsAt={endsAt} />
        </div>
      )}
    </Card>
  );
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const endTime = new Date(endsAt).getTime();
  const remaining = Math.max(0, endTime - now);
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex items-center gap-2 text-error">
      <ClockIcon className="w-4 h-4" />
      <span className="text-sm font-medium">
        Ends in {hours}h {minutes}m
      </span>
    </div>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CoinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14a1 1 0 011 1v3a6 6 0 01-6 6h-4a6 6 0 01-6-6V4a1 1 0 011-1zM12 13v5m-4 3h8" />
    </svg>
  );
}
