/**
 * Admin API Routes
 * GET /api/admin - Get admin dashboard stats
 * POST /api/admin - Admin actions (moderate quiz, ban user, etc)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// Check if wallet or FID is admin
async function isAdmin(walletAddress?: string, fid?: number): Promise<{ isAdmin: boolean; role: string | null }> {
  const supabase = createServerClient();
  
  // Check by wallet first
  if (walletAddress) {
    const { data } = await supabase
      .from('admin_users')
      .select('role')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();
    
    if (data) return { isAdmin: true, role: data.role };
  }
  
  // Check by FID
  if (fid) {
    const { data } = await supabase
      .from('admin_users')
      .select('role')
      .eq('fid', fid)
      .single();
    
    if (data) return { isAdmin: true, role: data.role };
  }
  
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
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent attempts
    const { data: recentAttempts } = await supabase
      .from('attempts')
      .select('id, quiz_id, wallet_address, score, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

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
      admins: adminsResult.data || [],
    });
  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

interface AdminAction {
  action: 'moderate_quiz' | 'ban_user' | 'unban_user' | 'set_winner' | 'add_admin' | 'remove_admin';
  quizId?: string;
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
    
    if (!adminWallet && !adminFid) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { isAdmin: hasAccess, role } = await isAdmin(adminWallet || undefined, adminFid);
    if (!hasAccess) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body: AdminAction = await request.json();
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
        if (!body.walletAddress) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'walletAddress required' }, { status: 400 });
        }

        const { error } = await supabase
          .from('banned_users')
          .upsert({
            wallet_address: body.walletAddress.toLowerCase(),
            reason: body.reason || 'Violation of terms',
            banned_by: adminWallet || `fid:${adminFid}`,
          });

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'User banned' });
      }

      case 'unban_user': {
        if (!body.walletAddress) {
          return NextResponse.json({ error: 'BAD_REQUEST', message: 'walletAddress required' }, { status: 400 });
        }

        const { error } = await supabase
          .from('banned_users')
          .delete()
          .eq('wallet_address', body.walletAddress.toLowerCase());

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

      default:
        return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
