'use client';

import { useState, useEffect } from 'react';
import { QuizCard } from '@/components/quiz/quiz-card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';
import { ChristmasTree } from '@/components/christmas/decorations';

interface RewardPool {
  tier: number;
  name: string;
  winnerCount: number;
  percentage: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  rewardPerWinner: string;
  rewardToken: string;
  remainingSpots: number;
  timePerQuestion: number;
  endsAt: string | null;
  stakeRequired: { token: string; amount: string } | null;
  rewardPools: RewardPool[];
  totalPoolAmount: string;
  entryFee: string | null;
  entryFeeToken: string | null;
  // Fun quiz and image fields
  isFunQuiz: boolean;
  coverImageUrl: string | null;
  // Creator info
  creatorUsername: string | null;
  createdAt: string;
}

type SortOption = 'newest' | 'ending_soon' | 'highest_reward' | 'most_spots';
type FilterOption = 'all' | 'no_stake' | 'ending_soon' | 'fun_only' | 'rewards_only';

export default function QuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  useEffect(() => {
    fetchQuizzes();
  }, []);

  async function fetchQuizzes() {
    try {
      setLoading(true);
      const res = await fetch('/api/quizzes');
      if (!res.ok) throw new Error('Failed to fetch quizzes');
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const filteredQuizzes = quizzes.filter(quiz => {
    if (filterBy === 'no_stake') return !quiz.stakeRequired && !quiz.isFunQuiz;
    if (filterBy === 'fun_only') return quiz.isFunQuiz;
    if (filterBy === 'rewards_only') return !quiz.isFunQuiz;
    if (filterBy === 'ending_soon') {
      if (!quiz.endsAt) return false;
      const hoursLeft = (new Date(quiz.endsAt).getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft < 24;
    }
    return true;
  });

  const sortedQuizzes = [...filteredQuizzes].sort((a, b) => {
    switch (sortBy) {
      case 'ending_soon':
        if (!a.endsAt) return 1;
        if (!b.endsAt) return -1;
        return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime();
      case 'highest_reward':
        return parseFloat(b.rewardPerWinner) - parseFloat(a.rewardPerWinner);
      case 'most_spots':
        return b.remainingSpots - a.remainingSpots;
      default:
        return 0;
    }
  });

  return (
    <ChristmasLayout>
      <main className="min-h-screen pb-20">
        {/* Filters Section */}
        <div className="px-4 py-4 border-b border-foreground/10 bg-background/50">
          <div className="flex items-center gap-3 mb-4">
            <ChristmasTree className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Browse Quizzes</h1>
              <p className="text-sm text-foreground-muted">
                {sortedQuizzes.length} quiz{sortedQuizzes.length !== 1 ? 'zes' : ''} available
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <FilterChip 
              active={filterBy === 'all'} 
              onClick={() => setFilterBy('all')}
            >
              All
            </FilterChip>
            <FilterChip 
              active={filterBy === 'fun_only'} 
              onClick={() => setFilterBy('fun_only')}
            >
              🎉 Fun
            </FilterChip>
            <FilterChip 
              active={filterBy === 'rewards_only'} 
              onClick={() => setFilterBy('rewards_only')}
            >
              🏆 Rewards
            </FilterChip>
            <FilterChip 
              active={filterBy === 'no_stake'} 
              onClick={() => setFilterBy('no_stake')}
            >
              No Stake
            </FilterChip>
            <FilterChip 
              active={filterBy === 'ending_soon'} 
              onClick={() => setFilterBy('ending_soon')}
            >
              Ending Soon
            </FilterChip>
          </div>

          {/* Sort */}
          <div className="flex gap-2 mt-2 overflow-x-auto">
            <SortChip 
              active={sortBy === 'newest'} 
              onClick={() => setSortBy('newest')}
            >
              Newest
            </SortChip>
            <SortChip 
              active={sortBy === 'ending_soon'} 
              onClick={() => setSortBy('ending_soon')}
            >
              Ending Soon
            </SortChip>
            <SortChip 
              active={sortBy === 'highest_reward'} 
              onClick={() => setSortBy('highest_reward')}
            >
              Highest Reward
            </SortChip>
            <SortChip 
              active={sortBy === 'most_spots'} 
              onClick={() => setSortBy('most_spots')}
            >
              Most Spots
            </SortChip>
          </div>
        </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <QuizListSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchQuizzes} />
        ) : sortedQuizzes.length === 0 ? (
          <EmptyState filterBy={filterBy} />
        ) : (
          <div className="grid gap-4">
            {sortedQuizzes.map(quiz => (
              <QuizCard
                key={quiz.id}
                id={quiz.id}
                title={quiz.title}
                description={quiz.description}
                questionCount={quiz.questionCount}
                rewardPerWinner={quiz.rewardPerWinner}
                rewardToken={quiz.rewardToken}
                remainingSpots={quiz.remainingSpots}
                endsAt={quiz.endsAt}
                stakeRequired={quiz.stakeRequired}
                rewardPools={quiz.rewardPools}
                totalPoolAmount={quiz.totalPoolAmount}
                entryFee={quiz.entryFee}
                isFunQuiz={quiz.isFunQuiz}
                coverImageUrl={quiz.coverImageUrl}
                creatorUsername={quiz.creatorUsername}
                createdAt={quiz.createdAt}
                onClick={() => router.push(`/quiz/${quiz.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
    </ChristmasLayout>
  );
}

function FilterChip({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
        transition-colors duration-200
        ${active 
          ? 'bg-primary text-white' 
          : 'bg-surface text-foreground-muted hover:bg-surface/80'
        }
      `}
    >
      {children}
    </button>
  );
}

function SortChip({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap
        transition-colors duration-200 border
        ${active 
          ? 'border-primary text-primary bg-primary/10' 
          : 'border-foreground/10 text-foreground-muted hover:border-foreground/20'
        }
      `}
    >
      {children}
    </button>
  );
}

function QuizListSkeleton() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-surface rounded-xl p-4 animate-pulse">
          <div className="h-5 bg-foreground/10 rounded w-3/4 mb-2" />
          <div className="h-4 bg-foreground/10 rounded w-1/2 mb-4" />
          <div className="flex gap-4 pt-4 border-t border-foreground/10">
            <div className="h-4 bg-foreground/10 rounded w-20" />
            <div className="h-4 bg-foreground/10 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filterBy }: { filterBy: FilterOption }) {
  const messages: Record<FilterOption, string> = {
    all: 'No quizzes available yet. Be the first to create one!',
    no_stake: 'No free quizzes available right now.',
    ending_soon: 'No quizzes ending soon.',
    fun_only: 'No fun quizzes available. Create one!',
    rewards_only: 'No reward quizzes available right now.',
  };

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
        <SearchIcon className="w-8 h-8 text-foreground-muted" />
      </div>
      <p className="text-foreground-muted">{messages[filterBy]}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
        <ErrorIcon className="w-8 h-8 text-error" />
      </div>
      <p className="text-foreground-muted mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
