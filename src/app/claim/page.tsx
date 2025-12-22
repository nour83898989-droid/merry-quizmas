'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChristmasLayout } from '@/components/christmas/christmas-layout';
import { Gift, ChristmasTree, Santa } from '@/components/christmas/decorations';
import { getCurrentNetwork, switchToBase, getAllTokenBalances, TokenBalance } from '@/lib/web3/client';
import { ACTIVE_CHAIN_ID, IS_TESTNET, getTokenByAddress } from '@/lib/web3/config';
import { claimRewardOnChain, waitForTransaction, getClaimableReward } from '@/lib/web3/transactions';
import { fetchUserByAddress, type FarcasterUserData } from '@/lib/neynar/client';

interface ClaimableReward {
  id: string;
  quizId: string;
  quizTitle: string;
  amount: string;
  token: string;
  rank: number;
  poolTier: number;
  rankInPool: number;
  completedAt: string;
  status: string;
  contractQuizId?: string; // Quiz ID used in smart contract
}

export default function ClaimPage() {
  const router = useRouter();
  const [address, setAddress] = useState<string | null>(null);
  const [rewards, setRewards] = useState<ClaimableReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [networkOk, setNetworkOk] = useState(true);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);

  const checkNetwork = useCallback(async () => {
    const network = await getCurrentNetwork();
    if (network) {
      setNetworkOk(network.isCorrect);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setAddress(accs[0]);
          fetchRewards(accs[0]);
          fetchTokenBalances(accs[0]);
          checkNetwork();
        } else {
          setLoading(false);
        }
      });

      // Listen for network changes
      window.ethereum.on?.('chainChanged', () => {
        checkNetwork();
      });
    } else {
      setLoading(false);
    }
  }, [checkNetwork]);

  const fetchRewards = async (walletAddress: string) => {
    try {
      const res = await fetch('/api/rewards', {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setRewards(data.rewards || []);
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenBalances = async (walletAddress: string) => {
    try {
      const balances = await getAllTokenBalances(walletAddress);
      setTokenBalances(balances);
    } catch (error) {
      console.error('Failed to fetch token balances:', error);
    }
  };

  const claimReward = async (rewardId: string) => {
    if (!address) return;
    
    // Check network first
    if (!networkOk) {
      setSwitchingNetwork(true);
      const switched = await switchToBase();
      setSwitchingNetwork(false);
      if (!switched) {
        setClaimError('Please switch to Base network to claim rewards');
        return;
      }
      setNetworkOk(true);
    }

    setClaiming(rewardId);
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) {
        setClaimError('Reward not found');
        setClaiming(null);
        return;
      }

      // Check if quiz has contract integration
      const hasContractIntegration = reward.contractQuizId && reward.contractQuizId.length > 0;

      if (hasContractIntegration) {
        // Use onchain claim for quizzes with contract
        const quizIdForContract = reward.contractQuizId!;

        // Check if there's claimable reward on contract
        const claimableAmount = await getClaimableReward(quizIdForContract, address);
        if (claimableAmount === BigInt(0)) {
          setClaimError('No claimable reward found on contract. The reward may have already been claimed or not yet set by the quiz creator.');
          setClaiming(null);
          return;
        }

        // Call contract to claim reward
        const result = await claimRewardOnChain(quizIdForContract, address);
        
        if (result.success && result.txHash) {
          // Wait for transaction confirmation
          const confirmed = await waitForTransaction(result.txHash);
          
          if (confirmed) {
            // Update local state
            setRewards(prev => prev.map(r => 
              r.id === rewardId ? { ...r, status: 'claimed' } : r
            ));
            
            // Update database
            await fetch(`/api/rewards/${rewardId}/claim`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': address,
              },
              body: JSON.stringify({ txHash: result.txHash }),
            });

            setClaimSuccess(`Reward claimed! TX: ${result.txHash.slice(0, 10)}...`);
            
            // Refresh token balances
            fetchTokenBalances(address);
          } else {
            setClaimError('Transaction failed or timed out');
          }
        } else {
          setClaimError(result.error || 'Failed to claim reward');
        }
      } else {
        // Legacy quiz without contract - just update database status
        // Note: This is for old quizzes that were created before contract integration
        setClaimError('This quiz was created before onchain integration. Please contact the quiz creator for manual reward distribution.');
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
      setClaimError('Failed to claim reward. Please try again.');
    } finally {
      setClaiming(null);
    }
  };

  const claimAll = async () => {
    if (!address) return;
    
    // Check network first
    if (!networkOk) {
      setSwitchingNetwork(true);
      const switched = await switchToBase();
      setSwitchingNetwork(false);
      if (!switched) {
        setClaimError('Please switch to Base network to claim rewards');
        return;
      }
      setNetworkOk(true);
    }

    setClaiming('all');
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const claimedIds: string[] = [];
      const failedIds: string[] = [];
      const skippedIds: string[] = [];

      // Filter only rewards with contract integration
      const contractRewards = pendingRewards.filter(r => r.contractQuizId && r.contractQuizId.length > 0);
      const legacyRewards = pendingRewards.filter(r => !r.contractQuizId || r.contractQuizId.length === 0);

      // Skip legacy rewards
      legacyRewards.forEach(r => skippedIds.push(r.id));

      // Claim each reward individually (contract doesn't support batch claim)
      for (const reward of contractRewards) {
        const quizIdForContract = reward.contractQuizId!;
        
        // Check if claimable
        const claimableAmount = await getClaimableReward(quizIdForContract, address);
        if (claimableAmount === BigInt(0)) {
          failedIds.push(reward.id);
          continue;
        }

        const result = await claimRewardOnChain(quizIdForContract, address);
        
        if (result.success && result.txHash) {
          const confirmed = await waitForTransaction(result.txHash);
          if (confirmed) {
            claimedIds.push(reward.id);
            
            // Update database
            await fetch(`/api/rewards/${reward.id}/claim`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': address,
              },
              body: JSON.stringify({ txHash: result.txHash }),
            });
          } else {
            failedIds.push(reward.id);
          }
        } else {
          failedIds.push(reward.id);
        }
      }

      // Update local state for claimed rewards
      if (claimedIds.length > 0) {
        setRewards(prev => prev.map(r => 
          claimedIds.includes(r.id) ? { ...r, status: 'claimed' } : r
        ));
        
        // Refresh token balances
        fetchTokenBalances(address);
      }

      if (claimedIds.length === contractRewards.length && contractRewards.length > 0) {
        const msg = skippedIds.length > 0 
          ? `${claimedIds.length} rewards claimed! ${skippedIds.length} legacy rewards skipped (no contract).`
          : `All ${claimedIds.length} rewards claimed successfully!`;
        setClaimSuccess(msg);
      } else if (claimedIds.length > 0) {
        setClaimSuccess(`${claimedIds.length} of ${contractRewards.length} rewards claimed. ${failedIds.length} failed.`);
      } else if (contractRewards.length === 0) {
        setClaimError('No rewards with onchain integration found. Legacy rewards require manual distribution.');
      } else {
        setClaimError('Failed to claim any rewards. They may not be set yet or already claimed.');
      }
    } catch (error) {
      console.error('Failed to claim all rewards:', error);
      setClaimError('Failed to claim rewards. Please try again.');
    } finally {
      setClaiming(null);
    }
  };

  const handleSwitchNetwork = async () => {
    setSwitchingNetwork(true);
    const switched = await switchToBase();
    setSwitchingNetwork(false);
    if (switched) {
      setNetworkOk(true);
      setClaimError(null);
    }
  };

  const pendingRewards = rewards.filter(r => r.status === 'pending');
  const totalUnclaimed = pendingRewards.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <ChristmasLayout>
        <main className="min-h-screen p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface rounded w-1/2" />
            <div className="h-32 bg-surface rounded-2xl" />
            <div className="h-24 bg-surface rounded-xl" />
            <div className="h-24 bg-surface rounded-xl" />
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
              Connect your wallet to view and claim your rewards
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
        {/* Network Warning */}
        {!networkOk && (
          <Card className="bg-warning/10 border-warning/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-sm font-medium text-warning">Wrong Network</span>
              </div>
              <Button
                size="sm"
                onClick={handleSwitchNetwork}
                isLoading={switchingNetwork}
                className="bg-warning text-white"
              >
                Switch to Base
              </Button>
            </div>
            <p className="text-xs text-foreground-muted mt-2">
              Please switch to {IS_TESTNET ? 'Base Sepolia' : 'Base'} network (Chain ID: {ACTIVE_CHAIN_ID}) to claim rewards
            </p>
          </Card>
        )}

        {/* Error Message */}
        {claimError && (
          <Card className="bg-error/10 border-error/30">
            <div className="flex items-center gap-2">
              <span className="text-lg">❌</span>
              <span className="text-sm text-error">{claimError}</span>
            </div>
          </Card>
        )}

        {/* Success Message */}
        {claimSuccess && (
          <Card className="bg-success/10 border-success/30">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span className="text-sm text-success">{claimSuccess}</span>
            </div>
          </Card>
        )}

        {/* Total Rewards Banner */}
        <Card className="christmas-card relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground-muted mb-1">🎁 Total Unclaimed</p>
              <p className="text-3xl font-bold text-foreground">
                {totalUnclaimed} {pendingRewards[0] ? (getTokenByAddress(pendingRewards[0].token)?.symbol || 'tokens') : 'tokens'}
              </p>
            </div>
            <div className="flex gap-2">
              <Gift className="w-16 h-16 opacity-50" />
              <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-bounce">
                <span className="text-xs font-bold text-white">{pendingRewards.length}</span>
              </div>
            </div>
          </div>
          {totalUnclaimed > 0 && (
            <Button
              onClick={claimAll}
              isLoading={claiming === 'all'}
              disabled={claiming !== null}
              fullWidth
              className="mt-4 christmas-gradient text-white"
            >
              🎄 Claim All Rewards
            </Button>
          )}
        </Card>

        {/* Wallet Token Balances */}
        {tokenBalances.length > 0 && (
          <Card>
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              💰 Your Wallet Balances
              <span className={`text-xs px-2 py-0.5 rounded-full ${IS_TESTNET ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                {IS_TESTNET ? 'Testnet' : 'Mainnet'}
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {tokenBalances.map((token) => (
                <div
                  key={token.symbol}
                  className="flex items-center gap-2 p-2 rounded-lg bg-surface/50"
                >
                  <TokenIcon symbol={token.symbol} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{token.formattedBalance}</p>
                    <p className="text-xs text-foreground-muted">{token.symbol}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Reward Pools Info */}
        {pendingRewards.some(r => r.poolTier > 0) && (
          <Card className="bg-primary/10 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏆</span>
              <span className="font-medium text-foreground">Pool Rewards</span>
            </div>
            <p className="text-xs text-foreground-muted">
              Your rewards are based on your finishing position in different reward tiers. 
              Faster completions earn higher tier rewards!
            </p>
          </Card>
        )}

        {/* Rewards List */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Your Rewards</h3>
          
          {rewards.length === 0 ? (
            <Card className="text-center py-8">
              <ChristmasTree className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-foreground-muted">No rewards to claim yet</p>
              <p className="text-sm text-foreground-muted mt-1">Win quizzes to earn rewards!</p>
              <Button variant="outline" onClick={() => router.push('/quizzes')} className="mt-4">
                Browse Quizzes
              </Button>
            </Card>
          ) : (
            rewards.map((reward) => {
              const isClaimed = reward.status === 'claimed';
              const isClaiming = claiming === reward.id;
              
              return (
                <Card
                  key={reward.id}
                  className={`christmas-card relative overflow-hidden ${isClaimed ? 'opacity-60' : ''}`}
                >
                  {isClaimed && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-success/20 rounded-full">
                      <span className="text-xs font-medium text-success">✓ Claimed</span>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <RankBadge rank={reward.rank || reward.rankInPool} />
                        <h4 className="font-semibold text-foreground">{reward.quizTitle}</h4>
                      </div>
                      <p className="text-xs text-foreground-muted">{formatDate(reward.completedAt)}</p>
                      {reward.poolTier > 0 && (
                        <p className="text-xs text-primary mt-1">
                          Pool Tier {reward.poolTier} • Rank #{reward.rankInPool} in pool
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xl font-bold text-success">{reward.amount}</p>
                      <p className="text-xs text-foreground-muted">
                        {getTokenByAddress(reward.token)?.symbol || reward.token}
                      </p>
                    </div>
                  </div>
                  
                  {!isClaimed && (
                    <Button
                      onClick={() => claimReward(reward.id)}
                      isLoading={isClaiming}
                      disabled={claiming !== null}
                      variant="outline"
                      fullWidth
                      className="mt-3"
                    >
                      Claim Reward
                    </Button>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-surface/50">
          <div className="flex items-start gap-3">
            <span className="text-foreground-muted flex-shrink-0">ℹ️</span>
            <div>
              <p className="text-sm text-foreground-muted">
                Rewards are sent directly to your connected wallet on {IS_TESTNET ? 'Base Sepolia (Testnet)' : 'Base'} network. 
                Make sure you have enough ETH for gas fees.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
    </ChristmasLayout>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colors = {
    1: 'bg-yellow-500/20 text-yellow-500',
    2: 'bg-gray-400/20 text-gray-400',
    3: 'bg-amber-600/20 text-amber-600',
  };
  
  const color = colors[rank as keyof typeof colors] || 'bg-foreground/10 text-foreground-muted';
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      #{rank}
    </span>
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
