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

// Create wagmi config with multiple connectors for cross-platform support
const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [
    farcasterMiniApp(),
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

// Auto-connect component that runs inside WagmiProvider
function AutoConnectWallet() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  
  useEffect(() => {
    // Auto-connect to Farcaster wallet if not connected
    if (!isConnected) {
      const farcasterConnector = connectors.find(c => 
        /farcaster/i.test(c.name) || /mini.?app/i.test(c.name)
      );
      
      if (farcasterConnector) {
        console.log('[Farcaster] Auto-connecting to wallet...');
        connect({ connector: farcasterConnector });
      }
    }
  }, [isConnected, connect, connectors]);
  
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
        
        // Check if in mini app
        isInMiniApp = await sdk.isInMiniApp().catch(() => false);
        
        if (isInMiniApp) {
          // Get user context - sdk.context is a Promise in v0.2.x
          const ctx = await sdk.context;
          if (ctx?.user) {
            user = {
              fid: ctx.user.fid,
              username: ctx.user.username,
              displayName: ctx.user.displayName,
              pfpUrl: ctx.user.pfpUrl,
            };
          }
          
          // Signal ready to Farcaster - CRITICAL for mobile
          await sdk.actions.ready();
          console.log('[Farcaster] SDK ready called, user:', user?.username);
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
          <AutoConnectWallet />
          <FarcasterInitializer onReady={handleReady}>
            {children}
          </FarcasterInitializer>
        </FarcasterContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
