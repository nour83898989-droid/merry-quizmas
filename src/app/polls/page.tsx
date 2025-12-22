'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PollCard } from '@/components/poll/poll-card';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';

interface PollOption {
  index: number;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  options: PollOption[];
  total_votes: number;
  ends_at: string | null;
  is_multiple_choice: boolean;
  created_at: string;
}

export default function PollsPage() {
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('all');

  useEffect(() => {
    fetchPolls();
  }, []);

  async function fetchPolls() {
    try {
      setLoading(true);
      const res = await fetch('/api/polls');
      if (!res.ok) throw new Error('Failed to fetch polls');
      const data = await res.json();
      setPolls(data.polls || []);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPolls = polls.filter((poll) => {
    if (filter === 'all') return true;
    const isEnded = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;
    return filter === 'active' ? !isEnded : isEnded;
  });

  return (
    <ChristmasLayout>
      <main className="min-h-screen pb-20">
        {/* Filters Section */}
        <div className="px-4 py-4 border-b border-foreground/10 bg-background/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">📊 Polls</h1>
              <p className="text-sm text-foreground-muted">
                {filteredPolls.length} poll{filteredPolls.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => router.push('/polls/create')} className="christmas-gradient text-white">
              <PlusIcon className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['all', 'active', 'ended'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-surface text-foreground-muted hover:bg-surface/80'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface rounded-xl p-4 animate-pulse">
                  <div className="h-5 bg-foreground/10 rounded w-3/4 mb-3" />
                  <div className="space-y-2">
                    <div className="h-8 bg-foreground/10 rounded" />
                    <div className="h-8 bg-foreground/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPolls.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📊</span>
              <p className="text-foreground-muted mb-4">No polls yet</p>
              <Button onClick={() => router.push('/polls/create')}>
                Create First Poll
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  id={poll.id}
                  title={poll.title}
                  description={poll.description}
                  options={poll.options}
                  totalVotes={poll.total_votes}
                  endsAt={poll.ends_at}
                  isMultipleChoice={poll.is_multiple_choice}
                  onClick={() => router.push(`/polls/${poll.id}`)}
                  showResults
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </ChristmasLayout>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
