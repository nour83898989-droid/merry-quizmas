'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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

interface AdminUser {
  id: string;
  wallet_address: string | null;
  fid: number | null;
  role: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banAddress, setBanAddress] = useState('');
  const [newAdminInput, setNewAdminInput] = useState('');
  const [addByFid, setAddByFid] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'quizzes' | 'users' | 'admins'>('overview');

  const fetchAdminData = useCallback(async (wallet: string) => {
    try {
      const res = await fetch('/api/admin', {
        headers: { 'x-wallet-address': wallet },
      });
      
      if (res.status === 403) {
        router.push('/');
        return;
      }
      
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      setRole(data.role);
      setStats(data.stats);
      setQuizzes(data.recentQuizzes || []);
      setAdmins(data.admins || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: unknown) => {
        const accs = accounts as string[];
        if (accs?.[0]) {
          setAddress(accs[0]);
          fetchAdminData(accs[0]);
        } else {
          router.push('/');
        }
      });
    } else {
      router.push('/');
    }
  }, [fetchAdminData, router]);

  const handleAction = async (action: string, data: Record<string, unknown>) => {
    if (!address) return;
    setActionLoading(action);
    
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ action, ...data }),
      });
      
      const result = await res.json();
      if (result.success) {
        fetchAdminData(address);
        setBanAddress('');
        setNewAdminInput('');
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

  return (
    <main className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">🛡️ Admin Dashboard</h1>
            <p className="text-sm text-foreground-muted">Role: {role}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            ← Back to App
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-foreground/10 pb-2">
          {(['overview', 'quizzes', 'users', 'admins'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'text-foreground-muted hover:bg-foreground/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total Quizzes" value={stats.totalQuizzes} icon="📝" />
              <StatCard label="Total Polls" value={stats.totalPolls} icon="📊" />
              <StatCard label="Total Attempts" value={stats.totalAttempts} icon="🎮" />
              <StatCard label="Total Winners" value={stats.totalWinners} icon="🏆" />
              <StatCard label="Pending Review" value={stats.pendingModeration} icon="⏳" highlight />
            </div>
          </div>
        )}

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Quizzes</h3>
            <div className="space-y-2">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="font-medium text-foreground">{quiz.title}</p>
                    <p className="text-xs text-foreground-muted">
                      {quiz.creator_wallet.slice(0, 8)}... • {new Date(quiz.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      quiz.moderation_status === 'approved' ? 'bg-success/20 text-success' :
                      quiz.moderation_status === 'rejected' ? 'bg-error/20 text-error' :
                      'bg-warning/20 text-warning'
                    }`}>
                      {quiz.moderation_status}
                    </span>
                    {quiz.moderation_status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction('moderate_quiz', { quizId: quiz.id, status: 'approved' })}
                          disabled={actionLoading === 'moderate_quiz'}
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('moderate_quiz', { quizId: quiz.id, status: 'rejected', reason: 'Violation' })}
                          disabled={actionLoading === 'moderate_quiz'}
                        >
                          ✗
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {quizzes.length === 0 && (
                <p className="text-center text-foreground-muted py-8">No quizzes found</p>
              )}
            </div>
          </Card>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Ban User</h3>
            <div className="flex gap-2">
              <Input
                value={banAddress}
                onChange={e => setBanAddress(e.target.value)}
                placeholder="Wallet address to ban"
                className="flex-1"
              />
              <Button
                onClick={() => handleAction('ban_user', { walletAddress: banAddress, reason: 'Admin action' })}
                disabled={!banAddress || actionLoading === 'ban_user'}
              >
                Ban User
              </Button>
            </div>
            <div className="mt-4">
              <Input
                value={banAddress}
                onChange={e => setBanAddress(e.target.value)}
                placeholder="Wallet address to unban"
                className="flex-1 mb-2"
              />
              <Button
                variant="outline"
                onClick={() => handleAction('unban_user', { walletAddress: banAddress })}
                disabled={!banAddress || actionLoading === 'unban_user'}
              >
                Unban User
              </Button>
            </div>
          </Card>
        )}

        {/* Admins Tab */}
        {activeTab === 'admins' && role === 'super_admin' && (
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Manage Admins</h3>
            
            {/* Toggle between Wallet and FID */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAddByFid(false)}
                className={`px-3 py-1 rounded-lg text-sm ${!addByFid ? 'bg-primary text-white' : 'bg-surface text-foreground-muted'}`}
              >
                By Wallet
              </button>
              <button
                onClick={() => setAddByFid(true)}
                className={`px-3 py-1 rounded-lg text-sm ${addByFid ? 'bg-primary text-white' : 'bg-surface text-foreground-muted'}`}
              >
                By FID
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <Input
                value={newAdminInput}
                onChange={e => setNewAdminInput(e.target.value)}
                placeholder={addByFid ? "Farcaster FID (e.g. 12345)" : "Wallet address (0x...)"}
                className="flex-1"
                type={addByFid ? "number" : "text"}
              />
              <Button
                onClick={() => {
                  const data = addByFid 
                    ? { fid: parseInt(newAdminInput), role: 'moderator' }
                    : { walletAddress: newAdminInput, role: 'moderator' };
                  handleAction('add_admin', data);
                }}
                disabled={!newAdminInput || actionLoading === 'add_admin'}
              >
                + Moderator
              </Button>
              <Button
                onClick={() => {
                  const data = addByFid 
                    ? { fid: parseInt(newAdminInput), role: 'admin' }
                    : { walletAddress: newAdminInput, role: 'admin' };
                  handleAction('add_admin', data);
                }}
                disabled={!newAdminInput || actionLoading === 'add_admin'}
              >
                + Admin
              </Button>
            </div>

            {/* Current Admins List */}
            <h4 className="text-sm font-medium text-foreground mb-2 mt-6">Current Admins</h4>
            <div className="space-y-2">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="font-medium text-foreground">
                      {admin.fid ? `FID: ${admin.fid}` : admin.wallet_address?.slice(0, 10) + '...'}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {admin.role} • {new Date(admin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      admin.role === 'super_admin' ? 'bg-primary/20 text-primary' :
                      admin.role === 'admin' ? 'bg-success/20 text-success' :
                      'bg-warning/20 text-warning'
                    }`}>
                      {admin.role}
                    </span>
                    {admin.role !== 'super_admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const data = admin.fid 
                            ? { fid: admin.fid }
                            : { walletAddress: admin.wallet_address };
                          handleAction('remove_admin', data);
                        }}
                        disabled={actionLoading === 'remove_admin'}
                      >
                        ✗
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {admins.length === 0 && (
                <p className="text-center text-foreground-muted py-4">No admins found</p>
              )}
            </div>

            <p className="text-sm text-foreground-muted mt-4">
              💡 Tip: You can add admins by wallet address OR Farcaster FID
            </p>
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
      <p className={`text-2xl font-bold ${highlight && value > 0 ? 'text-warning' : 'text-foreground'}`}>
        {value}
      </p>
    </Card>
  );
}
