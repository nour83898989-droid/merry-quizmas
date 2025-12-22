'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { searchUsersByUsername } from '@/lib/neynar/client';
import { useFarcaster } from '@/components/providers/farcaster-provider';

interface AdminStats {
  totalQuizzes: number;
  totalPolls: number;
  totalAttempts: number;
  totalWinners: number;
  pendingModeration: number;
}

interface Quiz {
  id: string;
  title: string;
  creator_wallet: string;
  status: string;
  moderation_status: string;
  created_at: string;
}

interface Poll {
  id: string;
  title: string;
  creator_address: string | null;
  total_votes: number;
  created_at: string;
}

interface Winner {
  id: string;
  quiz_id: string;
  wallet_address: string;
  rank: number;
  reward_amount: number;
  completion_time_ms: number;
  created_at: string;
}

interface RewardClaim {
  id: string;
  quiz_id: string;
  wallet_address: string;
  reward_amount: number;
  status: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  wallet_address: string | null;
  fid: number | null;
  role: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { user: farcasterUser, isInMiniApp } = useFarcaster();
  const [role, setRole] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banInput, setBanInput] = useState('');
  const [unbanInput, setUnbanInput] = useState('');
  const [newAdminInput, setNewAdminInput] = useState('');
  const [inputType, setInputType] = useState<'wallet' | 'fid' | 'username'>('wallet');
  const [activeTab, setActiveTab] = useState<'overview' | 'quizzes' | 'polls' | 'leaderboard' | 'rewards' | 'users' | 'admins'>('overview');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (address) headers['x-wallet-address'] = address;
    if (farcasterUser?.fid) headers['x-fid'] = String(farcasterUser.fid);
    return headers;
  }, [address, farcasterUser?.fid]);

  const fetchAdminData = useCallback(async () => {
    const headers = getAuthHeaders();
    if (Object.keys(headers).length === 0) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/admin', { headers });
      if (res.status === 403) { router.push('/'); return; }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRole(data.role);
      setStats(data.stats);
      setQuizzes(data.recentQuizzes || []);
      setPolls(data.recentPolls || []);
      setWinners(data.recentWinners || []);
      setClaims(data.recentClaims || []);
      setAdmins(data.admins || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router, getAuthHeaders]);

  useEffect(() => {
    if (isConnected && address) fetchAdminData();
    else if (farcasterUser?.fid) fetchAdminData();
    else if (!isConnected && !farcasterUser?.fid) setLoading(false);
  }, [isConnected, address, farcasterUser?.fid, fetchAdminData]);

  const handleAction = async (action: string, data: Record<string, unknown>) => {
    const headers = getAuthHeaders();
    if (Object.keys(headers).length === 0) return;
    setActionLoading(action);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ action, ...data }),
      });
      const result = await res.json();
      if (result.success) {
        fetchAdminData();
        setBanInput(''); setUnbanInput(''); setNewAdminInput(''); setLookupResult(null);
      } else {
        alert(result.message || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 bg-background">
        <div className="animate-pulse space-y-4 max-w-6xl mx-auto">
          <div className="h-12 bg-surface rounded-xl w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-surface rounded-xl" />)}
          </div>
        </div>
      </main>
    );
  }

  if (!isConnected && !farcasterUser?.fid) {
    return (
      <main className="min-h-screen p-4 bg-background flex items-center justify-center">
        <Card className="text-center max-w-sm p-6">
          <h2 className="text-xl font-bold text-foreground mb-2">🛡️ Admin Access</h2>
          <p className="text-foreground-muted mb-4">
            {isInMiniApp ? 'Loading your Farcaster account...' : 'Please connect your wallet to access the admin dashboard.'}
          </p>
          <Button variant="outline" onClick={() => router.push('/')}>← Back to Home</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">🛡️ Admin Dashboard</h1>
            <p className="text-sm text-foreground-muted">Role: {role}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>← Back to App</Button>
        </div>

        <div className="flex gap-2 border-b border-foreground/10 pb-2 overflow-x-auto">
          {(['overview', 'quizzes', 'polls', 'leaderboard', 'rewards', 'users', 'admins'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-primary text-white' : 'text-foreground-muted hover:bg-foreground/5'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Quizzes" value={stats.totalQuizzes} icon="📝" />
            <StatCard label="Total Polls" value={stats.totalPolls} icon="📊" />
            <StatCard label="Total Attempts" value={stats.totalAttempts} icon="🎮" />
            <StatCard label="Total Winners" value={stats.totalWinners} icon="🏆" />
            <StatCard label="Pending Review" value={stats.pendingModeration} icon="⏳" highlight />
          </div>
        )}

        {activeTab === 'quizzes' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Manage Quizzes</h3>
            <div className="space-y-2">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="font-medium text-foreground">{quiz.title}</p>
                    <p className="text-xs text-foreground-muted">{quiz.creator_wallet.slice(0, 8)}... • {new Date(quiz.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${quiz.status === 'active' ? 'bg-success/20 text-success' : quiz.status === 'deleted' ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'}`}>{quiz.status}</span>
                    {quiz.status !== 'deleted' && (
                      <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete quiz "${quiz.title}"?`)) handleAction('delete_quiz', { quizId: quiz.id }); }}
                        disabled={actionLoading === 'delete_quiz'} className="text-error border-error/30 hover:bg-error/10">🗑️</Button>
                    )}
                  </div>
                </div>
              ))}
              {quizzes.length === 0 && <p className="text-center text-foreground-muted py-8">No quizzes found</p>}
            </div>
          </Card>
        )}

        {activeTab === 'polls' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Manage Polls</h3>
            <div className="space-y-2">
              {polls.map(poll => (
                <div key={poll.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="font-medium text-foreground">{poll.title}</p>
                    <p className="text-xs text-foreground-muted">{poll.creator_address?.slice(0, 8) || 'Unknown'}... • {poll.total_votes} votes • {new Date(poll.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete poll "${poll.title}"? This cannot be undone.`)) handleAction('delete_poll', { pollId: poll.id }); }}
                      disabled={actionLoading === 'delete_poll'} className="text-error border-error/30 hover:bg-error/10">🗑️</Button>
                  </div>
                </div>
              ))}
              {polls.length === 0 && <p className="text-center text-foreground-muted py-8">No polls found</p>}
            </div>
          </Card>
        )}

        {activeTab === 'leaderboard' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Manage Leaderboard Entries</h3>
            <div className="space-y-2">
              {winners.map(winner => (
                <div key={winner.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="font-medium text-foreground">#{winner.rank} - {winner.wallet_address.slice(0, 8)}...{winner.wallet_address.slice(-4)}</p>
                    <p className="text-xs text-foreground-muted">Quiz: {winner.quiz_id.slice(0, 8)}... • Reward: {winner.reward_amount} • Time: {(winner.completion_time_ms / 1000).toFixed(2)}s</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete leaderboard entry?`)) handleAction('delete_leaderboard_entry', { winnerId: winner.id }); }}
                    disabled={actionLoading === 'delete_leaderboard_entry'} className="text-error border-error/30 hover:bg-error/10">🗑️</Button>
                </div>
              ))}
              {winners.length === 0 && <p className="text-center text-foreground-muted py-8">No leaderboard entries found</p>}
            </div>
          </Card>
        )}

        {activeTab === 'rewards' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Manage Reward Claims</h3>
            <div className="space-y-2">
              {claims.map(claim => (
                <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="font-medium text-foreground">{claim.wallet_address.slice(0, 8)}...{claim.wallet_address.slice(-4)}</p>
                    <p className="text-xs text-foreground-muted">Quiz: {claim.quiz_id.slice(0, 8)}... • Amount: {claim.reward_amount} • {new Date(claim.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${claim.status === 'claimed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>{claim.status}</span>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete reward claim?`)) handleAction('delete_reward_claim', { claimId: claim.id }); }}
                      disabled={actionLoading === 'delete_reward_claim'} className="text-error border-error/30 hover:bg-error/10">🗑️</Button>
                  </div>
                </div>
              ))}
              {claims.length === 0 && <p className="text-center text-foreground-muted py-8">No reward claims found</p>}
            </div>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Ban/Unban User</h3>
            <div className="flex gap-2 mb-4">
              {(['wallet', 'fid', 'username'] as const).map(type => (
                <button key={type} onClick={() => { setInputType(type); setLookupResult(null); }}
                  className={`px-3 py-1 rounded-lg text-sm ${inputType === type ? 'bg-primary text-white' : 'bg-surface text-foreground-muted'}`}>
                  By {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            {lookupResult && <div className="mb-4 p-2 bg-success/10 text-success rounded-lg text-sm">✓ Found: {lookupResult}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground-muted mb-2">Ban User</label>
                <div className="flex gap-2">
                  <Input value={banInput} onChange={e => setBanInput(e.target.value)}
                    placeholder={inputType === 'fid' ? "FID (e.g. 12345)" : inputType === 'username' ? "Username" : "Wallet (0x...)"}
                    className="flex-1" type={inputType === 'fid' ? "number" : "text"} />
                  <Button onClick={async () => {
                    if (inputType === 'username') {
                      setLookupLoading(true);
                      const users = await searchUsersByUsername(banInput, 1);
                      setLookupLoading(false);
                      if (users.length > 0) { setLookupResult(`@${users[0].username} (FID: ${users[0].fid})`); handleAction('ban_user', { fid: users[0].fid, reason: 'Admin action' }); }
                      else alert('Username not found');
                    } else if (inputType === 'fid') handleAction('ban_user', { fid: parseInt(banInput), reason: 'Admin action' });
                    else handleAction('ban_user', { walletAddress: banInput, reason: 'Admin action' });
                  }} disabled={!banInput || actionLoading === 'ban_user' || lookupLoading}>{lookupLoading ? '...' : 'Ban'}</Button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-foreground-muted mb-2">Unban User</label>
                <div className="flex gap-2">
                  <Input value={unbanInput} onChange={e => setUnbanInput(e.target.value)}
                    placeholder={inputType === 'fid' ? "FID (e.g. 12345)" : inputType === 'username' ? "Username" : "Wallet (0x...)"}
                    className="flex-1" type={inputType === 'fid' ? "number" : "text"} />
                  <Button variant="outline" onClick={async () => {
                    if (inputType === 'username') {
                      setLookupLoading(true);
                      const users = await searchUsersByUsername(unbanInput, 1);
                      setLookupLoading(false);
                      if (users.length > 0) { setLookupResult(`@${users[0].username} (FID: ${users[0].fid})`); handleAction('unban_user', { fid: users[0].fid }); }
                      else alert('Username not found');
                    } else if (inputType === 'fid') handleAction('unban_user', { fid: parseInt(unbanInput) });
                    else handleAction('unban_user', { walletAddress: unbanInput });
                  }} disabled={!unbanInput || actionLoading === 'unban_user' || lookupLoading}>{lookupLoading ? '...' : 'Unban'}</Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'admins' && role === 'super_admin' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Manage Admins</h3>
            <div className="flex gap-2 mb-4">
              {(['wallet', 'fid', 'username'] as const).map(type => (
                <button key={type} onClick={() => { setInputType(type); setLookupResult(null); }}
                  className={`px-3 py-1 rounded-lg text-sm ${inputType === type ? 'bg-primary text-white' : 'bg-surface text-foreground-muted'}`}>
                  By {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            {lookupResult && <div className="mb-4 p-2 bg-success/10 text-success rounded-lg text-sm">✓ Found: {lookupResult}</div>}
            <div className="flex gap-2 mb-4">
              <Input value={newAdminInput} onChange={e => setNewAdminInput(e.target.value)}
                placeholder={inputType === 'fid' ? "FID (e.g. 12345)" : inputType === 'username' ? "Username" : "Wallet (0x...)"}
                className="flex-1" type={inputType === 'fid' ? "number" : "text"} />
              <Button onClick={async () => {
                if (inputType === 'username') {
                  setLookupLoading(true);
                  const users = await searchUsersByUsername(newAdminInput, 1);
                  setLookupLoading(false);
                  if (users.length > 0) { setLookupResult(`@${users[0].username} (FID: ${users[0].fid})`); handleAction('add_admin', { fid: users[0].fid, role: 'moderator' }); }
                  else alert('Username not found');
                } else if (inputType === 'fid') handleAction('add_admin', { fid: parseInt(newAdminInput), role: 'moderator' });
                else handleAction('add_admin', { walletAddress: newAdminInput, role: 'moderator' });
              }} disabled={!newAdminInput || actionLoading === 'add_admin' || lookupLoading}>{lookupLoading ? '...' : '+ Mod'}</Button>
              <Button onClick={async () => {
                if (inputType === 'username') {
                  setLookupLoading(true);
                  const users = await searchUsersByUsername(newAdminInput, 1);
                  setLookupLoading(false);
                  if (users.length > 0) { setLookupResult(`@${users[0].username} (FID: ${users[0].fid})`); handleAction('add_admin', { fid: users[0].fid, role: 'admin' }); }
                  else alert('Username not found');
                } else if (inputType === 'fid') handleAction('add_admin', { fid: parseInt(newAdminInput), role: 'admin' });
                else handleAction('add_admin', { walletAddress: newAdminInput, role: 'admin' });
              }} disabled={!newAdminInput || actionLoading === 'add_admin' || lookupLoading}>{lookupLoading ? '...' : '+ Admin'}</Button>
            </div>
            <h4 className="text-sm font-medium text-foreground mb-2 mt-6">Current Admins</h4>
            <div className="space-y-2">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="font-medium text-foreground">{admin.fid ? `FID: ${admin.fid}` : admin.wallet_address?.slice(0, 10) + '...'}</p>
                    <p className="text-xs text-foreground-muted">{admin.role} • {new Date(admin.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${admin.role === 'super_admin' ? 'bg-primary/20 text-primary' : admin.role === 'admin' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>{admin.role}</span>
                    {admin.role !== 'super_admin' && (
                      <Button size="sm" variant="outline" onClick={() => handleAction('remove_admin', admin.fid ? { fid: admin.fid } : { walletAddress: admin.wallet_address })}
                        disabled={actionLoading === 'remove_admin'}>✗</Button>
                    )}
                  </div>
                </div>
              ))}
              {admins.length === 0 && <p className="text-center text-foreground-muted py-4">No admins found</p>}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: number; icon: string; highlight?: boolean }) {
  return (
    <Card className={highlight && value > 0 ? 'border-warning' : ''}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-foreground-muted">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight && value > 0 ? 'text-warning' : 'text-foreground'}`}>{value}</p>
    </Card>
  );
}
