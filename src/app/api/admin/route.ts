/**
 * Admin API Routes
 * GET /api/admin - Get admin dashboard stats
 * POST /api/admin - Admin actions (moderate quiz, ban user, etc)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || 'NEYNAR_API_DOCS';

// Lookup all wallet addresses from FID using Neynar
async function getWalletsFromFid(fid: number): Promise<string[]> {
  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const user = data?.users?.[0];
    const wallets: string[] = [];
    
    // Add all verified eth addresses
    if (user?.verified_addresses?.eth_addresses) {
      wallets.push(...user.verified_addresses.eth_addresses.map((w: string) => w.toLowerCase()));
    }
    // Add custody address as fallback
    if (user?.custody_address) {
      wallets.push(user.custody_address.toLowerCase());
    }
    
    return [...new Set(wallets)]; // Remove duplicates
  } catch {
    return [];
  }
}

// Get primary wallet from FID (for ban/unban operations)
async function getWalletFromFid(fid: number): Promise<string | null> {
  const wallets = await getWalletsFromFid(fid);
  return wallets[0] || null;
}

// Lookup FID from wallet address using Neynar
async function getFidFromWallet(walletAddress: string): Promise<number | null> {
  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/by_verification?address=${walletAddress}`, {
      headers: { 'accept': 'application/json', 'api_key': NEYNAR_API_KEY }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.user?.fid || null;
  } catch {
    return null;
  }
}

// Check if wallet or FID is admin
// Now supports checking all wallets connected to a FID via Neynar
async function isAdmin(walletAddress?: string, fid?: number): Promise<{ isAdmin: boolean; role: string | null }> {
  const supabase = createServerClient();
  
  // Check by wallet first (direct match in admin_users)
  if (walletAddress) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') console.log('[isAdmin] wallet check error:', error.message);
    if (data) {
      console.log('[isAdmin] Found by wallet:', walletAddress, 'role:', data.role);
      return { isAdmin: true, role: data.role };
    }
    
    // If wallet not found directly, try to find FID from wallet via Neynar
    // Then check if that FID is admin
    const fidFromWallet = await getFidFromWallet(walletAddress);
    if (fidFromWallet) {
      const { data: fidData } = await supabase
        .from('admin_users')
        .select('role')
        .eq('fid', fidFromWallet)
        .single();
      
      if (fidData) {
        console.log('[isAdmin] Found by FID from wallet lookup:', fidFromWallet, 'role:', fidData.role);
        return { isAdmin: true, role: fidData.role };
      }
    }
  }
  
  // Check by FID directly
  if (fid) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('fid', fid)
      .single();
    
    if (error && error.code !== 'PGRST116') console.log('[isAdmin] fid check error:', error.message);
    if (data) {
      console.log('[isAdmin] Found by FID:', fid, 'role:', data.role);
      return { isAdmin: true, role: data.role };
    }
    
    // If FID not found directly, get all wallets for this FID
    // Then check if any of those wallets are admin
    const walletsFromFid = await getWalletsFromFid(fid);
    for (const wallet of walletsFromFid) {
      const { data: walletData } = await supabase
        .from('admin_users')
        .select('role')
        .eq('wallet_address', wallet)
        .single();
      
      if (walletData) {
        console.log('[isAdmin] Found by wallet from FID lookup:', wallet, 'role:', walletData.role);
        return { isAdmin: true, role: walletData.role };
      }
    }
  }
  
  console.log('[isAdmin] Not found - wallet:', walletAddress, 'fid:', fid);
  return { isAdmin: false, role: null };
}

/**
 * GET /api/admin
 * Returns admin dashboard stats
 */
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    const fidHeader = request.headers.get('x-fid');
    const fid = fidHeader ? parseInt(fidHeader) : undefined;
    
    if (!walletAddress && !fid) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { isAdmin: hasAccess, role } = await isAdmin(walletAddress || undefined, fid);
    if (!hasAccess) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 });
    }

    const supabase = createServerClient();

    // Get stats
    const [quizzesResult, pollsResult, attemptsResult, winnersResult, pendingResult, adminsResult] = await Promise.all([
      supabase.from('quizzes').select('id', { count: 'exact' }),
      supabase.from('polls').select('id', { count: 'exact' }),
      supabase.from('attempts').select('id', { count: 'exact' }),
      supabase.from('winners').select('id', { count: 'exact' }),
      supabase.from('quizzes').select('id', { count: 'exact' }).eq('moderation_status', 'pending'),
      supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
    ]);

    // Get recent quizzes
    const { data: recentQuizzes } = await supabase
      .from('quizzes')
      .select('id, title, creator_wallet, status, moderation_status, created_at')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get recent attempts
    const { data: recentAttempts } = await supabase
      .from('attempts')
      .select('id, quiz_id, wallet_address, score, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent polls
    const { data: recentPolls } = await supabase
      .from('polls')
      .select('id, title, creator_address, total_votes, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get recent winners (leaderboard entries)
    const { data: recentWinners } = await supabase
      .from('winners')
      .select('id, quiz_id, wallet_address, rank, reward_amount, completion_time_ms, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get recent reward claims
    const { data: recentClaims } = await supabase
      .from('reward_claims')
      .select('id, quiz_id, wallet_address, reward_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      role,
      stats: {
        totalQuizzes: quizzesResult.count || 0,
        totalPolls: pollsResult.count || 0,
        totalAttempts: attemptsResult.count || 0,
        totalWinners: winnersResult.count || 0,
        pendingModeration: pendingResult.count || 0,
      },
      recentQuizzes: recentQuizzes || [],
      recentAttempts: recentAttempts || [],
      recentPolls: recentPolls || [],
      recentWinners: recentWinners || [],
      recentClaims: recentClaims || [],
      admins: adminsResult.data || [],
    });
  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

interface AdminAction {
  action: 'moderate_quiz' | 'ban_user' | 'unban_user' | 'set_winner' | 'add_admin' | 'remove_admin' | 'delete_quiz' | 'delete_poll' | 'delete_leaderboard_entry' | 'delete_reward_claim';
  quizId?: string;
  pollId?: string;
  winnerId?: string;
  claimId?: string;
  walletAddress?: string;
  fid?: number; // Support FID for adding admins
  status?: 'approved' | 'rejected';
  reason?: string;
  role?: 'admin' | 'moderator';
  winners?: { walletAddress: string; rank: number }[];
}

/**
 * POST /api/admin
 * Perform admin actions
 */
export async function POST(request: NextRequest) {
  try {
    const adminWallet = request.headers.get('x-wallet-address');
    const fidHeader = request.headers.get('x-fid');
    const adminFid = fidHeader ? parseInt(fidHeader) : undefined;
    
    console.log('[Admin POST] Headers - wallet:', adminWallet, 'fid:', adminFid);
    
    if (!adminWallet && !adminFid) {
      console.log('[Admin POST] No auth headers');
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { isAdmin: hasAccess, role } = await isAdmin(adminWallet || undefined, adminFid);
    console.log('[Admin POST] isAdmin result:', hasAccess, 'role:', role);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body: AdminAction = await request.json();
    console.log('[Admin POST] Action:', body.action, 'data:', JSON.stringify(body));
    const supabase = createServerClient();

    switch (body.action) {
      case 'moderate_quiz': {
        if (!body.quizId || !body.status) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'quizId and status required' }, { status: 400 });
        }

        const { error } = await supabase
          .from('quizzes')
          .update({
            moderation_status: body.status,
            moderated_by: adminWallet,
            moderated_at: new Date().toISOString(),
            rejection_reason: body.status === 'rejected' ? body.reason : null,
            status: body.status === 'approved' ? 'active' : 'rejected',
          })
          .eq('id', body.quizId);

        if (error) throw error;
        return NextResponse.json({ success: true, message: `Quiz ${body.status}` });
      }

      case 'ban_user': {
        // Support banning by wallet OR FID
        if (!body.walletAddress && !body.fid) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'walletAddress or fid required' }, { status: 400 });
        }

        // If FID provided, lookup wallet address
        let walletToBan: string | undefined = body.walletAddress?.toLowerCase();
        if (!walletToBan && body.fid) {
          const foundWallet = await getWalletFromFid(body.fid);
          if (!foundWallet) {
            return NextResponse.json({ error: 'NOT_FOUND', message: 'Could not find wallet for FID' }, { status: 404 });
          }
          walletToBan = foundWallet;
        }

        const banData = {
          wallet_address: walletToBan!,
          reason: body.reason || 'Violation of terms',
          banned_by: adminWallet || `fid:${adminFid}`,
        };

        const { error } = await supabase
          .from('banned_users')
          .upsert(banData);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'User banned' });
      }

      case 'unban_user': {
        // Support unbanning by wallet OR FID
        if (!body.walletAddress && !body.fid) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'walletAddress or fid required' }, { status: 400 });
        }

        // If FID provided, lookup wallet address
        let walletToUnban: string | undefined = body.walletAddress?.toLowerCase();
        if (!walletToUnban && body.fid) {
          const foundWallet = await getWalletFromFid(body.fid);
          if (!foundWallet) {
            return NextResponse.json({ error: 'NOT_FOUND', message: 'Could not find wallet for FID' }, { status: 404 });
          }
          walletToUnban = foundWallet;
        }

        const { error } = await supabase
          .from('banned_users')
          .delete()
          .eq('wallet_address', walletToUnban!);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'User unbanned' });
      }

      case 'add_admin': {
        if (role !== 'super_admin') {
          return NextResponse.json({ error: 'FORBIDDEN', message: 'Super admin required' }, { status: 403 });
        }
        
        // Support adding by wallet OR FID
        if (!body.walletAddress && !body.fid) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'walletAddress or fid required' }, { status: 400 });
        }
        if (!body.role) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'role required' }, { status: 400 });
        }

        const insertData = {
          wallet_address: body.walletAddress?.toLowerCase() || null,
          fid: body.fid || null,
          role: body.role,
          created_by: adminWallet || `fid:${adminFid}`,
        };

        const { error } = await supabase
          .from('admin_users')
          .upsert(insertData);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Admin added' });
      }

      case 'remove_admin': {
        if (role !== 'super_admin') {
          return NextResponse.json({ error: 'FORBIDDEN', message: 'Super admin required' }, { status: 403 });
        }
        
        // Support removing by wallet OR FID
        if (!body.walletAddress && !body.fid) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'walletAddress or fid required' }, { status: 400 });
        }

        let query = supabase.from('admin_users').delete();
        
        if (body.walletAddress) {
          query = query.eq('wallet_address', body.walletAddress.toLowerCase());
        } else if (body.fid) {
          query = query.eq('fid', body.fid);
        }

        const { error } = await query;

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Admin removed' });
      }

      case 'delete_quiz': {
        // Soft delete quiz and cascade delete related data
        if (!body.quizId) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'quizId required' }, { status: 400 });
        }

        console.log('[Admin] delete_quiz started for:', body.quizId, 'by:', adminWallet || `fid:${adminFid}`);

        // Delete related winners
        const { error: winnersError } = await supabase
          .from('winners')
          .delete()
          .eq('quiz_id', body.quizId);
        if (winnersError) console.log('[Admin] winners delete error:', winnersError);

        // Delete related attempts
        const { error: attemptsError } = await supabase
          .from('attempts')
          .delete()
          .eq('quiz_id', body.quizId);
        if (attemptsError) console.log('[Admin] attempts delete error:', attemptsError);

        // Delete related reward_claims
        const { error: claimsError } = await supabase
          .from('reward_claims')
          .delete()
          .eq('quiz_id', body.quizId);
        if (claimsError) console.log('[Admin] reward_claims delete error:', claimsError);

        // Soft delete the quiz
        const { error } = await supabase
          .from('quizzes')
          .update({ status: 'deleted' })
          .eq('id', body.quizId);

        if (error) {
          console.log('[Admin] quiz update error:', error);
          throw error;
        }
        
        console.log('[Admin] delete_quiz completed for:', body.quizId);
        return NextResponse.json({ success: true, message: 'Quiz and related data deleted' });
      }

      case 'delete_poll': {
        // Hard delete poll (polls table doesn't have status column)
        if (!body.pollId) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'pollId required' }, { status: 400 });
        }

        // First delete related poll_votes
        await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', body.pollId);

        // Then delete the poll
        const { error } = await supabase
          .from('polls')
          .delete()
          .eq('id', body.pollId);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Poll deleted' });
      }

      case 'delete_leaderboard_entry': {
        // Hard delete winner entry
        if (!body.winnerId) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'winnerId required' }, { status: 400 });
        }

        const { error } = await supabase
          .from('winners')
          .delete()
          .eq('id', body.winnerId);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Leaderboard entry deleted' });
      }

      case 'delete_reward_claim': {
        // Hard delete reward claim
        if (!body.claimId) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'claimId required' }, { status: 400 });
        }

        const { error } = await supabase
          .from('reward_claims')
          .delete()
          .eq('id', body.claimId);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Reward claim deleted' });
      }

      default:
        return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
