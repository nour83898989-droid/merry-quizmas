'use client';

import type React from 'react';
import { useEffect, useMemo, useState, createContext, useContext, useCallback, type ReactNode } from 'react';
import { WagmiProvider, createConfig, useConnect, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import { base, baseSepolia } from 'viem/chains';
import { http } from 'viem';

// Use testnet based on env
const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';
const activeChain = IS_TESTNET ? baseSepolia : base;

const queryClient = new QueryClient();

// Simple wagmi config like geoguesser - only farcasterMiniApp connector
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [miniAppConnector()],
  ssr: true,
  multiInjectedProviderDiscovery: true,
});

interface FarcasterUser {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface FarcasterContextType {
  isReady: boolean;
  isInMiniApp: boolean;
  user: FarcasterUser | null;
  activeChain: typeof base | typeof baseSepolia;
  isTestnet: boolean;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isReady: false,
  isInMiniApp: false,
  user: null,
  activeChain: activeChain,
  isTestnet: IS_TESTNET,
});

export function useFarcaster() {
  return useContext(FarcasterContext);
}

// Export the connector for use in connect buttons
export { miniAppConnector as farcasterMiniApp };

// Simple auto-connect like geoguesser
function AutoConnect() {
  const { isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isConnected) return;
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const inMiniApp = await sdk.isInMiniApp().catch(() => false);
        if (!inMiniApp) return;
        
        // Use injected or first available connector (like geoguesser)
        const injectedConn =
          connectors.find((c) => c.id === 'injected' || c.name.toLowerCase().includes('injected')) ||
          connectors[0];
        if (!injectedConn) return;
        if (cancelled) return;
        
        await connectAsync({ connector: injectedConn });
        console.log('[AutoConnect] Connected via', injectedConn.name);
      } catch (e) {
        console.log('[AutoConnect] Failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, connectors, connectAsync]);
  
  return null;
}

// SDK initializer - calls ready() and gets user context
function SdkInitializer({ 
  onReady 
}: { 
  onReady: (data: { isInMiniApp: boolean; user: FarcasterUser | null }) => void;
}) {
  useEffect(() => {
    let cancelled = false;
    
    async function init() {
      let isInMiniApp = false;
      let user: FarcasterUser | null = null;
      
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        isInMiniApp = await sdk.isInMiniApp().catch(() => false);
        
        if (isInMiniApp) {
          console.log('[SDK] In MiniApp detected');
          
          // Get user context
          try {
            const ctx = await sdk.context;
            if (ctx?.user) {
              user = {
                fid: ctx.user.fid,
                username: ctx.user.username,
                displayName: ctx.user.displayName,
                pfpUrl: ctx.user.pfpUrl,
              };
              console.log('[SDK] User:', user.username);
            }
          } catch (e) {
            console.log('[SDK] Context error:', e);
          }
          
          // Call ready() to hide splash screen
          try {
            await sdk.actions.ready();
            console.log('[SDK] ready() called');
          } catch (e) {
            console.log('[SDK] ready() error:', e);
          }
        }
      } catch (e) {
        console.log('[SDK] Not available:', e);
      }
      
      if (!cancelled) {
        onReady({ isInMiniApp, user });
      }
    }
    
    init();
    
    return () => { cancelled = true; };
  }, [onReady]);
  
  return null;
}

export function FarcasterProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  
  const handleReady = useCallback((data: { isInMiniApp: boolean; user: FarcasterUser | null }) => {
    setIsInMiniApp(data.isInMiniApp);
    setUser(data.user);
    setIsReady(true);
    console.log('[Provider] Ready:', data);
  }, []);

  const contextValue = useMemo(() => ({
    isReady,
    isInMiniApp,
    user,
    activeChain,
    isTestnet: IS_TESTNET,
  }), [isReady, isInMiniApp, user]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <FarcasterContext.Provider value={contextValue}>
          <SdkInitializer onReady={handleReady} />
          <AutoConnect />
          {children}
        </FarcasterContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
