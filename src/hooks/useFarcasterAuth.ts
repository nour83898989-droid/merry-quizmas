'use client';

import { useCallback } from 'react';
import { useFarcaster } from '@/components/providers/farcaster-provider';

/**
 * Hook for Farcaster authentication
 * Provides auth token and authenticated fetch wrapper
 */
export function useFarcasterAuth() {
  const { authToken, getAuthToken, isAuthenticated, isInMiniApp, user } = useFarcaster();

  /**
   * Fetch with authentication
   * - In MiniApp: Uses Quick Auth token (Bearer)
   * - In Browser: Uses x-wallet-address header (fallback)
   */
  const authFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = new Headers(options.headers);
    
    if (isInMiniApp) {
      // Get fresh token (SDK handles caching)
      const token = await getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    // Always add FID if available (for backend to identify user)
    if (user?.fid) {
      headers.set('x-farcaster-fid', String(user.fid));
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  }, [isInMiniApp, getAuthToken, user?.fid]);

  /**
   * Get headers for authenticated requests
   * Useful when you need to pass headers to other libraries
   */
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {};
    
    if (isInMiniApp) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    if (user?.fid) {
      headers['x-farcaster-fid'] = String(user.fid);
    }
    
    return headers;
  }, [isInMiniApp, getAuthToken, user?.fid]);

  return {
    // State
    authToken,
    isAuthenticated,
    fid: user?.fid,
    
    // Methods
    getAuthToken,
    authFetch,
    getAuthHeaders,
  };
}
