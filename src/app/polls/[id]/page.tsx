'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';
import { useFarcaster } from '@/components/providers/farcaster-provider';

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
  is_anonymous: boolean;
  creator_fid: number;
  created_at: string;
}

export default function PollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { user: farcasterUser } = useFarcaster();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptions, setVotedOptions] = useState<number[]>([]);
  const [isVoting, setIsVoting] = useState(false);

  // Get voter identifier (FID or wallet address)
  const voterFid = farcasterUser?.fid || null;
  const voterWallet = address || null;

  useEffect(() => {
    fetchPoll();
  }, [id]);

  // Check vote status when wallet/fid changes
  useEffect(() => {
    if (voterFid || voterWallet) {
      checkVoteStatus();
    }
  }, [id, voterFid, voterWallet]);

  async function fetchPoll() {
    try {
      const res = await fetch(`/api/polls/${id}`);
      if (!res.ok) throw new Error('Poll not found');
      const data = await res.json();
      setPoll(data.poll);
    } catch (error) {
      console.error('Error fetching poll:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkVoteStatus() {
    try {
      // Build query params based on available identifiers
      const params = new URLSearchParams();
      if (voterFid) params.append('voter_fid', voterFid.toString());
      if (voterWallet) params.append('voter_wallet', voterWallet);
      
      if (params.toString() === '') return;
      
      const res = await fetch(`/api/polls/${id}/vote?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHasVoted(data.hasVoted);
        setVotedOptions(data.votedOptions || []);
      }
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  }

  const toggleOption = (index: number) => {
    if (hasVoted || isEnded) return;

    if (poll?.is_multiple_choice) {
      setSelectedOptions((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
    } else {
      setSelectedOptions([index]);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0 || !poll) return;
    
    // Require some form of identification
    if (!voterFid && !voterWallet) {
      alert('Please connect your wallet to vote');
      return;
    }

    setIsVoting(true);
    try {
      const res = await fetch(`/api/polls/${id}/vote`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(voterWallet ? { 'x-wallet-address': voterWallet } : {}),
          ...(voterFid ? { 'x-fid': voterFid.toString() } : {}),
        },
        body: JSON.stringify({
          voterFid,
          voterWallet,
          optionIndexes: selectedOptions,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      setHasVoted(true);
      setVotedOptions(selectedOptions);
      fetchPoll(); // Refresh to get updated counts
    } catch (error) {
      console.error('Error voting:', error);
      alert(error instanceof Error ? error.message : 'Failed to vote');
    } finally {
      setIsVoting(false);
    }
  };

  const isEnded = poll?.ends_at ? new Date(poll.ends_at) < new Date() : false;
  const showResults = hasVoted || isEnded;

  const getTimeLeft = () => {
    if (!poll?.ends_at) return null;
    const end = new Date(poll.ends_at);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Poll ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} days left`;
    }
    return `${hours}h ${minutes}m left`;
  };

  if (loading) {
    return (
      <ChristmasLayout>
        <main className="min-h-screen p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface rounded w-3/4" />
            <div className="h-4 bg-surface rounded w-1/2" />
            <div className="space-y-2 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-surface rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </ChristmasLayout>
    );
  }

  if (!poll) {
    return (
      <ChristmasLayout>
        <main className="min-h-screen flex items-center justify-center p-4">
          <Card className="text-center max-w-sm christmas-card">
            <span className="text-6xl mb-4 block">😕</span>
            <h2 className="text-xl font-bold text-foreground mb-2">Poll Not Found</h2>
            <p className="text-foreground-muted mb-4">
              This poll may have been deleted or doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push('/polls')} fullWidth>
              Browse Polls
            </Button>
          </Card>
        </main>
      </ChristmasLayout>
    );
  }

  return (
    <ChristmasLayout>
      <main className="min-h-screen pb-24">
        {/* Header */}
        <header className="px-4 py-4 border-b border-foreground/10 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <BackIcon className="w-5 h-5" />
            </Button>
            <span className="text-2xl">📊</span>
            <h1 className="text-lg font-bold text-foreground">Poll</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Wallet Connection Warning */}
          {!isConnected && (
            <Card className="bg-warning/10 border-warning/20">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <p className="text-sm text-foreground">Connect wallet to vote</p>
              </div>
            </Card>
          )}

          {/* Poll Info */}
          <Card className="christmas-card">
            <h2 className="text-xl font-bold text-foreground mb-2">{poll.title}</h2>
            {poll.description && (
              <p className="text-foreground-muted mb-4">{poll.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-foreground-muted">
              <span>🗳️ {poll.total_votes} votes</span>
              {getTimeLeft() && <span>⏱️ {getTimeLeft()}</span>}
              {poll.is_multiple_choice && (
                <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs">
                  Multiple choice
                </span>
              )}
            </div>
          </Card>

          {/* Options */}
          <Card className="christmas-card">
            <h3 className="text-sm font-medium text-foreground-muted mb-3">
              {showResults ? 'Results' : 'Select your answer'}
            </h3>
            <div className="space-y-2">
              {poll.options.map((option) => {
                const percentage =
                  poll.total_votes > 0
                    ? (option.votes / poll.total_votes) * 100
                    : 0;
                const isSelected = selectedOptions.includes(option.index);
                const wasVoted = votedOptions.includes(option.index);

                return (
                  <button
                    key={option.index}
                    onClick={() => toggleOption(option.index)}
                    disabled={hasVoted || isEnded || !isConnected}
                    className={`w-full relative rounded-xl overflow-hidden transition-all ${
                      isSelected || wasVoted
                        ? 'ring-2 ring-primary'
                        : 'hover:ring-1 hover:ring-foreground/20'
                    } ${hasVoted || isEnded || !isConnected ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {showResults && (
                      <div
                        className="absolute inset-0 bg-primary/20 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                    <div className="relative px-4 py-3 flex items-center justify-between bg-surface/50">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected || wasVoted
                              ? 'border-primary bg-primary'
                              : 'border-foreground/30'
                          }`}
                        >
                          {(isSelected || wasVoted) && (
                            <CheckIcon className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-foreground font-medium">
                          {option.text}
                        </span>
                      </div>
                      {showResults && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground-muted">
                            {option.votes}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Vote Status */}
          {hasVoted && (
            <Card className="bg-success/10 border-success/20">
              <div className="flex items-center gap-2 text-success">
                <CheckIcon className="w-5 h-5" />
                <span className="font-medium">You voted!</span>
              </div>
            </Card>
          )}
        </div>

        {/* Footer - Vote Button */}
        {!hasVoted && !isEnded && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-foreground/10">
            <Button
              onClick={handleVote}
              disabled={selectedOptions.length === 0 || isVoting || !isConnected}
              isLoading={isVoting}
              fullWidth
              className="christmas-gradient text-white"
            >
              {!isConnected ? 'Connect Wallet to Vote' : `Vote (${selectedOptions.length} selected)`}
            </Button>
          </div>
        )}
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
