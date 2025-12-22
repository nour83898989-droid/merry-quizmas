'use client'

import { useFarcaster } from '@/components/providers/farcaster-provider'

/**
 * Hook to check if running inside Farcaster MiniApp
 * Uses FarcasterProvider context to avoid duplicate SDK calls
 */
export function useIsInFarcaster(): boolean {
  const { isInMiniApp, isReady } = useFarcaster()
  
  // Return false until provider is ready to avoid flash
  if (!isReady) return false
  
  return isInMiniApp
}
