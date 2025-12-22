'use client';

import { useEffect, useState, createContext, useContext, type ReactNode } from 'react';

interface FarcasterContextType {
  isReady: boolean;
  isInFrame: boolean;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isReady: false,
  isInFrame: false,
});

export function useFarcaster() {
  return useContext(FarcasterContext);
}

export function FarcasterProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isInFrame, setIsInFrame] = useState(false);

  useEffect(() => {
    async function initFarcaster() {
      try {
        // Check if we're in a Farcaster frame
        const inFrame = typeof window !== 'undefined' && 
          (window.parent !== window || window.location !== window.parent.location);
        
        setIsInFrame(inFrame);

        // Import and initialize Farcaster SDK
        const { sdk } = await import('@farcaster/frame-sdk');
        
        // Signal that the app is ready
        await sdk.actions.ready();
        setIsReady(true);
        
        console.log('Farcaster SDK ready');
      } catch (error) {
        // Not in a Farcaster frame or SDK not available
        console.log('Not in Farcaster frame or SDK unavailable:', error);
        setIsReady(true); // Still mark as ready for non-frame usage
      }
    }

    initFarcaster();
  }, []);

  return (
    <FarcasterContext.Provider value={{ isReady, isInFrame }}>
      {children}
    </FarcasterContext.Provider>
  );
}
