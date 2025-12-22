'use client';

import { useEffect, useMemo, useState, createContext, useContext, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http, useConnect, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { base, baseSepolia } from 'viem/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';

// Use testnet based on env
const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';
const activeChain = IS_TESTNET ? baseSepolia : base;

const queryClient = new QueryClient();

// Create wagmi config - connectors added separately for flexibility
const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Merry Quizmas' }),
  ],
  ssr: true,
});

interface FarcasterContextType {
  isReady: boolean;
  isInMiniApp: boolean;
  activeChain: typeof base | typeof baseSepolia;
  isTestnet: boolean;
  user: {
    fid?: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  } | null;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isReady: false,
  isInMiniApp: false,
  activeChain: activeChain,
  isTestnet: IS_TESTNET,
  user: null,
});

export function useFarcaster() {
  return useContext(FarcasterContext);
}

// Export the connector for use in connect buttons
export { farcasterMiniApp };

// Auto-connect component - connects using farcasterMiniApp connector directly
function AutoConnectWallet({ isInMiniApp }: { isInMiniApp: boolean }) {
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const [attempted, setAttempted] = useState(false);
  
  useEffect(() => {
    // Only auto-connect once, and only if in mini app
    if (!isConnected && !attempted && isInMiniApp) {
      setAttempted(true);
      console.log('[Farcaster] Auto-connecting wallet...');
      // Use farcasterMiniApp() directly as per official example
      connect({ connector: farcasterMiniApp() });
    }
  }, [isConnected, attempted, isInMiniApp, connect]);
  
  return null;
}

function FarcasterInitializer({ 
  children, 
  onReady 
}: { 
  children: ReactNode;
  onReady: (data: { isInMiniApp: boolean; user: FarcasterContextType['user'] }) => void;
}) {
  useEffect(() => {
    let cancelled = false;
    
    async function init() {
      let isInMiniApp = false;
      let user: FarcasterContextType['user'] = null;
      
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        
        // CRITICAL: Call sdk.actions.ready() FIRST - this signals to Farcaster that app is ready
        // This must be called regardless of isInMiniApp check
        try {
          await sdk.actions.ready();
          console.log('[Farcaster] SDK ready called');
        } catch (readyError) {
          console.log('[Farcaster] SDK ready error (expected outside miniapp):', readyError);
        }
        
        // Check if in mini app
        isInMiniApp = await sdk.isInMiniApp().catch(() => false);
        console.log('[Farcaster] isInMiniApp:', isInMiniApp);
        
        if (isInMiniApp) {
          // Get user context - sdk.context is a Promise in v0.2.x
          try {
            const ctx = await sdk.context;
            if (ctx?.user) {
              user = {
                fid: ctx.user.fid,
                username: ctx.user.username,
                displayName: ctx.user.displayName,
                pfpUrl: ctx.user.pfpUrl,
              };
              console.log('[Farcaster] User context:', user?.username);
            }
          } catch (ctxError) {
            console.log('[Farcaster] Context error:', ctxError);
          }
        }
      } catch (e) {
        console.log('[Farcaster] SDK init error:', e);
      }
      
      if (!cancelled) {
        onReady({ isInMiniApp, user });
      }
    }
    
    init();
    
    return () => { cancelled = true; };
  }, [onReady]);
  
  return <>{children}</>;
}

export function FarcasterProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [user, setUser] = useState<FarcasterContextType['user']>(null);
  
  const handleReady = useMemo(() => (data: { isInMiniApp: boolean; user: FarcasterContextType['user'] }) => {
    setIsInMiniApp(data.isInMiniApp);
    setUser(data.user);
    setIsReady(true);
  }, []);

  const contextValue = useMemo(() => ({
    isReady,
    isInMiniApp,
    activeChain,
    isTestnet: IS_TESTNET,
    user,
  }), [isReady, isInMiniApp, user]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <FarcasterContext.Provider value={contextValue}>
          <FarcasterInitializer onReady={handleReady}>
            <AutoConnectWallet isInMiniApp={isInMiniApp} />
            {children}
          </FarcasterInitializer>
        </FarcasterContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
