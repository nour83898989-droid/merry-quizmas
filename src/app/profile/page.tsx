'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';
import { Gift, Santa } from '@/components/christmas/decorations';
import { getAllTokenBalances, TokenBalance } from '@/lib/web3/client';
import { IS_TESTNET } from '@/lib/web3/config';
import { fetchUserByAddress, type FarcasterUserData } from '@/lib/neynar/client';
import { useFarcaster } from '@/components/providers/farcaster-provider';

interface UserStats {
  totalQuizzes: number;
  totalWins: number;
  totalRewards: string;
  winRate: number;
}

interface RecentActivity {
  id: string;
  quizTitle: string;
  result: 'win' | 'loss';
  reward?: string;
  date: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { user: farcasterUser } = useFarcaster();
  const [stats, setStats] = useState<UserStats>({
    totalQuizzes: 0,
    totalWins: 0,
    totalRewards: '0',
    winRate: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserData(address);
      fetchTokenBalances(address);
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchTokenBalances = async (walletAddress: string) => {
    setLoadingBalances(true);
    try {
      const balances = await getAllTokenBalances(walletAddress);
      setTokenBalances(balances);
    } catch (error) {
      console.error('Failed to fetch token balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  };

  const fetchUserData = async (walletAddress: string) => {
    try {
      // Fetch real stats from attempts and winners tables
      const [attemptsRes, winnersRes, claimsRes] = await Promise.all([
        fetch(`/api/profile/stats?wallet=${walletAddress}`),
        fetch(`/api/rewards?wallet=${walletAddress}`),
        fetch(`/api/rewards?wallet=${walletAddress}&status=pending`),
      ]);

      // Parse attempts stats
      if (attemptsRes.ok) {
        const attemptsData = await attemptsRes.json();
        const totalQuizzes = attemptsData.totalAttempts || 0;
        const totalWins = attemptsData.totalWins || 0;
        const totalRewards = attemptsData.totalRewards || '0';
        const winRate = totalQuizzes > 0 ? ((totalWins / totalQuizzes) * 100).toFixed(1) : '0';
        
        setStats({
          totalQuizzes,
          totalWins,
          totalRewards,
          winRate: parseFloat(winRate),
        });
      }

      // Parse recent activities from winners
      if (winnersRes.ok) {
        const winnersData = await winnersRes.json();
        const recentActivities: RecentActivity[] = (winnersData.claims || []).slice(0, 5).map((claim: {
          id: string;
          quiz_title?: string;
          reward_amount?: number;
          status?: string;
          created_at?: string;
        }) => ({
          id: claim.id,
          quizTitle: claim.quiz_title || 'Quiz',
          result: 'win' as const,
          reward: claim.reward_amount?.toString(),
          date: claim.created_at ? new Date(claim.created_at).toLocaleDateString() : '',
        }));
        setActivities(recentActivities);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // Fallback to empty state instead of mock data
      setStats({ totalQuizzes: 0, totalWins: 0, totalRewards: '0', winRate: 0 });
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (loading) {
    return (
      <ChristmasLayout>
        <main className="min-h-screen p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-surface rounded-2xl" />
            <div className="h-24 bg-surface rounded-xl" />
            <div className="h-48 bg-surface rounded-xl" />
          </div>
        </main>
      </ChristmasLayout>
    );
  }

  if (!address) {
    return (
      <ChristmasLayout>
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
          <Card className="text-center max-w-sm christmas-card">
            <Santa className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Connect Wallet</h2>
            <p className="text-foreground-muted mb-6">
              Connect your wallet to view your profile and stats
            </p>
            <Button onClick={() => router.push('/')} fullWidth>
              Go to Home
            </Button>
          </Card>
        </main>
      </ChristmasLayout>
    );
  }

  return (
    <ChristmasLayout>
      <main className="min-h-screen pb-20">
        <div className="p-4 space-y-4">
          {/* Profile Card */}
          <Card className="christmas-card">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full christmas-gradient flex items-center justify-center overflow-hidden">
                {farcasterUser?.pfpUrl ? (
                  <img 
                    src={farcasterUser.pfpUrl} 
                    alt={farcasterUser.username || 'Profile'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Santa className="w-10 h-10" />
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {farcasterUser?.username ? `@${farcasterUser.username}` : truncateAddress(address)}
                </p>
                {farcasterUser?.displayName && (
                  <p className="text-sm text-foreground-muted">{farcasterUser.displayName}</p>
                )}
                {farcasterUser?.fid && (
                  <p className="text-xs text-foreground-muted">FID: {farcasterUser.fid}</p>
                )}
                {!farcasterUser && (
                  <p className="text-sm text-foreground-muted">Quiz Champion</p>
                )}
              </div>
            </div>
          </Card>

        {/* Token Balances */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">💰 Token Balances</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${IS_TESTNET ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
              {IS_TESTNET ? 'Testnet' : 'Mainnet'}
            </span>
          </div>
          {loadingBalances ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-surface/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : tokenBalances.length > 0 ? (
            <div className="space-y-2">
              {tokenBalances.map((token) => (
                <div
                  key={token.symbol}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface/50"
                >
                  <div className="flex items-center gap-3">
                    <TokenIcon symbol={token.symbol} />
                    <div>
                      <p className="font-medium text-foreground">{token.symbol}</p>
                      <p className="text-xs text-foreground-muted">{token.name}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">{token.formattedBalance}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-foreground-muted py-4">No tokens found</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => address && fetchTokenBalances(address)}
            className="mt-3 w-full"
            disabled={loadingBalances}
          >
            {loadingBalances ? 'Loading...' : 'Refresh Balances'}
          </Button>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<QuizIcon className="w-5 h-5 text-primary" />}
            label="Quizzes Played"
            value={stats.totalQuizzes.toString()}
          />
          <StatCard
            icon={<TrophyIcon className="w-5 h-5 text-warning" />}
            label="Total Wins"
            value={stats.totalWins.toString()}
          />
          <StatCard
            icon={<CoinIcon className="w-5 h-5 text-success" />}
            label="Total Rewards"
            value={`${stats.totalRewards} tokens`}
          />
          <StatCard
            icon={<ChartIcon className="w-5 h-5 text-secondary" />}
            label="Win Rate"
            value={`${stats.winRate}%`}
          />
        </div>

        {/* Unclaimed Rewards */}
        <Card className="christmas-card relative overflow-hidden">
          <div className="absolute top-2 right-2">
            <Gift className="w-12 h-12 opacity-50" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground-muted">Unclaimed Rewards</p>
              <p className="text-2xl font-bold text-success">250 tokens</p>
            </div>
            <Button onClick={() => router.push('/claim')} className="christmas-gradient text-white">
              Claim Now
            </Button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <h3 className="text-base font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b border-foreground/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.result === 'win' ? 'bg-success/20' : 'bg-error/20'
                  }`}>
                    {activity.result === 'win' ? (
                      <TrophyIcon className="w-4 h-4 text-success" />
                    ) : (
                      <XIcon className="w-4 h-4 text-error" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.quizTitle}</p>
                    <p className="text-xs text-foreground-muted">{activity.date}</p>
                  </div>
                </div>
                {activity.reward && (
                  <span className="text-sm font-semibold text-success">+{activity.reward}</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => router.push('/quizzes')} fullWidth>
            Browse Quizzes
          </Button>
          <Button variant="outline" onClick={() => router.push('/create')} fullWidth>
            Create Quiz
          </Button>
        </div>
      </div>
    </main>
    </ChristmasLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="christmas-card">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-foreground-muted">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </Card>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TokenIcon({ symbol }: { symbol: string }) {
  const colors: Record<string, string> = {
    'ETH': 'bg-blue-500',
    'USDC': 'bg-green-500',
    'tUSDC': 'bg-green-500',
    'SUP': 'bg-purple-500',
    'tSUP': 'bg-purple-500',
    'BANGER': 'bg-orange-500',
    'tBANGER': 'bg-orange-500',
  };

  return (
    <div className={`w-8 h-8 rounded-full ${colors[symbol] || 'bg-gray-500'} flex items-center justify-center`}>
      <span className="text-white text-xs font-bold">
        {symbol.replace('t', '').slice(0, 2)}
      </span>
    </div>
  );
}


function QuizIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function CoinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </svg>
  );
}
