'use client';

import { useEffect, useMemo, useState, createContext, useContext, type ReactNode } from 'react';
import { WagmiProvider, createConfig, useAccount, useConnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import { base, baseSepolia } from 'viem/chains';
import { http } from 'viem';

// Use testnet based on env
const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';
const activeChain = IS_TESTNET ? baseSepolia : base;

const queryClient = new QueryClient();

const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [miniAppConnector()],
  ssr: true,
  multiInjectedProviderDiscovery: true,
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
        
        // Find the injected connector
        const injectedConn = connectors.find(
          (c) => c.id === 'injected' || c.name.toLowerCase().includes('injected')
        ) || connectors[0];
        
        if (!injectedConn) return;
        if (cancelled) return;
        
        await connectAsync({ connector: injectedConn });
      } catch (e) {
        console.log('AutoConnect failed:', e);
      }
    })();
    
    return () => { cancelled = true; };
  }, [isConnected, connectors, connectAsync]);
  
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
          // Get user context - sdk.context is a Promise
          const ctx = await sdk.context;
          if (ctx?.user) {
            user = {
              fid: ctx.user.fid,
              username: ctx.user.username,
              displayName: ctx.user.displayName,
              pfpUrl: ctx.user.pfpUrl,
            };
          }
          
          // Signal ready to Farcaster
          await sdk.actions.ready();
        }
      } catch (e) {
        console.log('Farcaster SDK init:', e);
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
        <AutoConnect />
        <FarcasterContext.Provider value={contextValue}>
          <FarcasterInitializer onReady={handleReady}>
            {children}
          </FarcasterInitializer>
        </FarcasterContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
