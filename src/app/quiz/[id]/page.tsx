'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';
import { joinQuizOnChain, waitForTransaction, hasJoinedQuiz } from '@/lib/web3/transactions';
import { getTokenByAddress, getTokenDisplayName, IS_TESTNET } from '@/lib/web3/config';

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
  question_count: number;
  time_per_question: number;
  reward_per_winner: string;
  reward_token: string;
  remaining_spots: number;
  total_spots: number;
  ends_at: string | null;
  stake_required: { token: string; amount: string } | null;
  reward_pools: RewardPool[];
  total_pool_amount: string;
  entry_fee: string | null;
  entry_fee_token: string | null;
  contract_quiz_id?: string; // Quiz ID used in smart contract
}

export default function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { address: walletAddress, isConnected } = useAccount();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const fetchQuiz = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quizzes/${id}`);
      if (!res.ok) throw new Error('Quiz not found');
      const data = await res.json();
      setQuiz(data.quiz);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  async function handleStart() {
    if (!quiz) return;
    
    if (!isConnected || !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }
    
    setStarting(true);
    setError(null);
    
    try {
      // Check if quiz has contract integration (entry fee or stake required)
      const hasEntryFee = quiz.entry_fee && quiz.entry_fee_token && parseFloat(quiz.entry_fee) > 0;
      const hasStake = quiz.stake_required && parseFloat(quiz.stake_required.amount) > 0;
      const contractQuizId = quiz.contract_quiz_id;

      // If quiz has onchain requirements, process them first
      if (contractQuizId && (hasEntryFee || hasStake)) {
        // Check if already joined on contract
        const alreadyJoined = await hasJoinedQuiz(contractQuizId, walletAddress);
        
        if (!alreadyJoined) {
          // Get token info for decimals
          const entryFeeToken = quiz.entry_fee_token ? getTokenByAddress(quiz.entry_fee_token) : null;
          const stakeToken = quiz.stake_required?.token ? getTokenByAddress(quiz.stake_required.token) : null;

          // Join quiz on contract (pays entry fee and/or stake)
          const joinResult = await joinQuizOnChain(
            contractQuizId,
            hasEntryFee ? quiz.entry_fee_token : null,
            hasEntryFee ? quiz.entry_fee : null,
            entryFeeToken?.decimals || 18,
            hasStake ? quiz.stake_required!.token : null,
            hasStake ? quiz.stake_required!.amount : null,
            stakeToken?.decimals || 18,
            walletAddress
          );

          if (!joinResult.success) {
            setError(joinResult.error || 'Failed to join quiz on blockchain');
            setStarting(false);
            return;
          }

          // Wait for transaction confirmation
          if (joinResult.txHash) {
            const confirmed = await waitForTransaction(joinResult.txHash);
            if (!confirmed) {
              setError('Transaction failed or timed out');
              setStarting(false);
              return;
            }
          }
        }
      }

      // Start quiz session via API
      const res = await fetch(`/api/quizzes/${id}/start`, {
        method: 'POST',
        headers: {
          'x-wallet-address': walletAddress,
        },
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Failed to start quiz');
      }
      
      const data = await res.json();
      
      // Store session data for play page
      // Convert token address to display name for share functionality
      const tokenDisplayName = getTokenDisplayName(quiz.reward_token);
      const sessionData = {
        sessionId: data.sessionId,
        quizId: id,
        quizTitle: quiz.title,
        questions: data.questions,
        timePerQuestion: data.timePerQuestion,
        rewardPerWinner: quiz.reward_per_winner,
        rewardToken: tokenDisplayName,
      };
      sessionStorage.setItem(`quiz-session-${data.sessionId}`, JSON.stringify(sessionData));
      // Store wallet address for API calls in play page
      sessionStorage.setItem('wallet-address', walletAddress);
      
      router.push(`/quiz/${id}/play?session=${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start quiz');
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <ChristmasLayout>
        <main className="min-h-screen p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface rounded w-3/4" />
            <div className="h-4 bg-surface rounded w-1/2" />
            <div className="h-32 bg-surface rounded" />
          </div>
        </main>
      </ChristmasLayout>
    );
  }

  if (error || !quiz) {
    return (
      <ChristmasLayout>
        <main className="min-h-screen flex items-center justify-center p-4">
          <Card className="text-center max-w-sm christmas-card">
            <ErrorIcon className="w-12 h-12 text-error mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {error || 'Quiz not found'}
            </h2>
            <Button variant="outline" onClick={() => router.push('/quizzes')}>
              Back to Quizzes
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
      <header className="px-4 py-4 border-b border-foreground/10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/quizzes')}>
            <BackIcon className="w-5 h-5 mr-2" />
            Back
          </Button>
          {/* Wallet status shown in navbar */}
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-foreground-muted">{quiz.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            icon={<QuestionIcon className="w-5 h-5" />}
            label="Questions"
            value={quiz.question_count.toString()}
          />
          <StatCard 
            icon={<ClockIcon className="w-5 h-5" />}
            label="Time per Question"
            value={`${quiz.time_per_question}s`}
          />
          <StatCard 
            icon={<UsersIcon className="w-5 h-5" />}
            label="Spots Left"
            value={`${quiz.remaining_spots}/${quiz.total_spots}`}
          />
          <StatCard 
            icon={<CoinIcon className="w-5 h-5 text-success" />}
            label="Reward"
            value={quiz.reward_per_winner}
            valueColor="text-success"
          />
        </div>

        {/* Rules */}
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-3">Rules</h3>
          <ul className="space-y-2 text-sm text-foreground-muted">
            <li className="flex items-start gap-2">
              <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              Answer all {quiz.question_count} questions correctly to win
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              You have {quiz.time_per_question} seconds per question
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              Once submitted, answers cannot be changed
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              Faster completion = higher tier rewards
            </li>
            {quiz.stake_required && (
              <li className="flex items-start gap-2">
                <AlertIcon className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                Stake required: {quiz.stake_required.amount} {getTokenDisplayName(quiz.stake_required.token)}
              </li>
            )}
            {quiz.entry_fee && quiz.entry_fee_token && (
              <li className="flex items-start gap-2">
                <AlertIcon className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                Entry fee: {quiz.entry_fee} {getTokenDisplayName(quiz.entry_fee_token)}
              </li>
            )}
          </ul>
        </Card>

        {/* Reward Pools */}
        {quiz.reward_pools && quiz.reward_pools.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-3">🏆 Reward Tiers</h3>
            <p className="text-xs text-foreground-muted mb-3">
              Total Pool: {quiz.total_pool_amount} {getTokenDisplayName(quiz.reward_token)}
            </p>
            <div className="space-y-2">
              {quiz.reward_pools.map((pool) => {
                const poolAmount = quiz.total_pool_amount 
                  ? ((parseFloat(quiz.total_pool_amount) * pool.percentage) / 100).toFixed(2)
                  : '0';
                const perWinner = pool.winnerCount > 0 && quiz.total_pool_amount
                  ? ((parseFloat(quiz.total_pool_amount) * pool.percentage) / 100 / pool.winnerCount).toFixed(4)
                  : '0';

                return (
                  <div key={pool.tier} className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {pool.tier}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{pool.name}</p>
                        <p className="text-xs text-foreground-muted">{pool.winnerCount} winners</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-success">{poolAmount} ({pool.percentage}%)</p>
                      <p className="text-xs text-foreground-muted">{perWinner}/winner</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Warnings */}
        {quiz.remaining_spots <= 5 && (
          <Card className="bg-warning/10 border-warning/30">
            <div className="flex items-center gap-2 text-warning">
              <AlertIcon className="w-5 h-5" />
              <span className="font-medium">Only {quiz.remaining_spots} spots left!</span>
            </div>
          </Card>
        )}

        {/* Wallet Warning */}
        {!isConnected && (
          <Card className="bg-primary/10 border-primary/30">
            <div className="flex items-center gap-2 text-primary">
              <AlertIcon className="w-5 h-5" />
              <span className="font-medium">Connect your wallet in the header to start the quiz</span>
            </div>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-foreground/10">
        <Button 
          onClick={handleStart} 
          fullWidth 
          isLoading={starting}
          disabled={quiz.remaining_spots === 0 || !isConnected}
          className="christmas-gradient text-white"
        >
          {quiz.remaining_spots === 0 ? 'No Spots Available' : !isConnected ? '🔗 Connect Wallet First' : '◆ Start Quiz'}
        </Button>
      </div>
    </main>
    </ChristmasLayout>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  valueColor = 'text-foreground' 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  valueColor?: string;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className="text-foreground-muted">{icon}</div>
      <div>
        <p className="text-xs text-foreground-muted">{label}</p>
        <p className={`text-lg font-semibold ${valueColor}`}>{value}</p>
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

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
