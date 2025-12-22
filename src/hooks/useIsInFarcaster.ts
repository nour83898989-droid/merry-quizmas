'use client'

import { useState, useEffect } from 'react'

export function useIsInFarcaster(): boolean {
  const [isInFarcaster, setIsInFarcaster] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        const inMiniApp = await sdk.isInMiniApp().catch(() => false)
        if (!cancelled) setIsInFarcaster(!!inMiniApp)
      } catch {
        if (!cancelled) setIsInFarcaster(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return isInFarcaster
}
