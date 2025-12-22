/**
 * Auth Middleware
 * Verifies Quick Auth JWT and extracts user information
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AuthUser {
  fid: number;
  address?: string;
  username?: string;
}

export interface AuthResult {
  isAuthenticated: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Verify Farcaster Quick Auth JWT token
 * In production, this should use @farcaster/quick-auth for proper verification
 */
export async function verifyQuickAuthToken(token: string): Promise<AuthResult> {
  try {
    // For development, we'll do basic JWT parsing
    // In production, use @farcaster/quick-auth verifyToken
    
    if (!token) {
      return { isAuthenticated: false, error: 'No token provided' };
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    // Basic JWT structure validation
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      return { isAuthenticated: false, error: 'Invalid token format' };
    }

    // Decode payload (middle part)
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8')
      );

      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return { isAuthenticated: false, error: 'Token expired' };
      }

      // Extract user info from payload
      const user: AuthUser = {
        fid: payload.fid || payload.sub,
        address: payload.address || payload.custody_address,
        username: payload.username,
      };

      if (!user.fid) {
        return { isAuthenticated: false, error: 'Invalid token: missing FID' };
      }

      return { isAuthenticated: true, user };
    } catch {
      return { isAuthenticated: false, error: 'Failed to decode token' };
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return { isAuthenticated: false, error: 'Token verification failed' };
  }
}

/**
 * Extract auth info from request headers
 */
export async function getAuthFromRequest(request: NextRequest): Promise<AuthResult> {
  // Try Authorization header first (Quick Auth JWT)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    return verifyQuickAuthToken(authHeader);
  }

  // Fallback to x-wallet-address header (for browser/testing)
  const walletAddress = request.headers.get('x-wallet-address');
  if (walletAddress) {
    return {
      isAuthenticated: true,
      user: {
        fid: 0, // No FID for wallet-only auth
        address: walletAddress,
      },
    };
  }

  return { isAuthenticated: false, error: 'No authentication provided' };
}

/**
 * Auth middleware wrapper for API routes
 */
export function withAuth(
  handler: (request: NextRequest, auth: AuthUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await getAuthFromRequest(request);

    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(request, authResult.user);
  };
}

/**
 * Optional auth - doesn't fail if not authenticated
 */
export async function getOptionalAuth(request: NextRequest): Promise<AuthUser | null> {
  const authResult = await getAuthFromRequest(request);
  return authResult.isAuthenticated ? authResult.user || null : null;
}
