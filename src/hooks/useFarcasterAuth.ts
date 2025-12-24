'use client';

import { useCallback } from 'react';
import { useFarcaster } from '@/components/providers/farcaster-provider';

/**
 * Hook for Farcaster authentication
 * Simplified version - no Quick Auth (removed for Base App compatibility)
 */
export function useFarcasterAuth() {
  const { isInMiniApp, user } = useFarcaster();

  /**
   * Fetch with authentication
   * Uses FID header for backend identification
   */
  const authFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = new Headers(options.headers);
    
    // Add FID if available (for backend to identify user)
    if (user?.fid) {
      headers.set('x-farcaster-fid', String(user.fid));
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  }, [user?.fid]);

  /**
   * Get headers for authenticated requests
   */
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {};
    
    if (user?.fid) {
      headers['x-farcaster-fid'] = String(user.fid);
    }
    
    return headers;
  }, [user?.fid]);

  return {
    // State
    isAuthenticated: !!user?.fid,
    fid: user?.fid,
    isInMiniApp,
    
    // Methods
    authFetch,
    getAuthHeaders,
  };
}
