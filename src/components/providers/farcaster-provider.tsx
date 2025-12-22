'use client';

import { useEffect, useMemo, useState, createContext, useContext, useCallback, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http, useConnect, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { base, baseSepolia } from 'viem/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';

// Use testnet based on env
const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';
const activeChain = IS_TESTNET ? baseSepolia : base;

const queryClient = new QueryClient();

// Create wagmi config with farcasterMiniApp as FIRST connector (per official docs)
const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [
    farcasterMiniApp(),  // MUST be first - used as connectors[0] for connect
    injected(),
    coinbaseWallet({ appName: 'Merry Quizmas' }),
  ],
  ssr: true,
});

interface FarcasterUser {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface FarcasterContextType {
  // SDK State
  isReady: boolean;
  isInMiniApp: boolean;
  platformType: 'mobile' | 'web' | null;
  
  // User State
  user: FarcasterUser | null;
  
  // Auth State (Quick Auth)
  authToken: string | null;
  isAuthenticated: boolean;
  getAuthToken: () => Promise<string | null>;
  
  // Chain Config
  activeChain: typeof base | typeof baseSepolia;
  isTestnet: boolean;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isReady: false,
  isInMiniApp: false,
  platformType: null,
  user: null,
  authToken: null,
  isAuthenticated: false,
  getAuthToken: async () => null,
  activeChain: activeChain,
  isTestnet: IS_TESTNET,
});

export function useFarcaster() {
  return useContext(FarcasterContext);
}

// Export the connector for use in connect buttons
export { farcasterMiniApp };


// Auto-connect component - waits for isReady before attempting
function AutoConnectWallet({ isReady, isInMiniApp }: { isReady: boolean; isInMiniApp: boolean }) {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [attempted, setAttempted] = useState(false);
  
  useEffect(() => {
    // Only auto-connect when:
    // 1. SDK is ready (isReady = true)
    // 2. In mini app
    // 3. Not already connected
    // 4. Haven't attempted yet
    if (isReady && isInMiniApp && !isConnected && !attempted && connectors.length > 0) {
      setAttempted(true);
      console.log('[Farcaster] Auto-connecting with connector:', connectors[0]?.name);
      connect({ connector: connectors[0] });
    }
  }, [isReady, isInMiniApp, isConnected, attempted, connect, connectors]);
  
  return null;
}

interface InitData {
  isInMiniApp: boolean;
  platformType: 'mobile' | 'web' | null;
  user: FarcasterUser | null;
  authToken: string | null;
}

function FarcasterInitializer({ 
  children, 
  onReady 
}: { 
  children: ReactNode;
  onReady: (data: InitData) => void;
}) {
  useEffect(() => {
    let cancelled = false;
    
    async function init() {
      const result: InitData = {
        isInMiniApp: false,
        platformType: null,
        user: null,
        authToken: null,
      };
      
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        
        // STEP 1: Check if in mini app FIRST (before calling ready)
        result.isInMiniApp = await sdk.isInMiniApp().catch(() => false);
        console.log('[Farcaster] isInMiniApp:', result.isInMiniApp);
        
        if (result.isInMiniApp) {
          // STEP 2: Get user context
          try {
            const ctx = await sdk.context;
            if (ctx?.user) {
              result.user = {
                fid: ctx.user.fid,
                username: ctx.user.username,
                displayName: ctx.user.displayName,
                pfpUrl: ctx.user.pfpUrl,
              };
              console.log('[Farcaster] User:', result.user?.username);
            }
            
            // Get platform type (mobile or web/desktop)
            if (ctx?.client?.clientFid) {
              // Warpcast mobile has clientFid
              result.platformType = 'mobile';
            } else {
              result.platformType = 'web';
            }
          } catch (ctxError) {
            console.log('[Farcaster] Context error:', ctxError);
          }
          
          // STEP 3: Get Quick Auth token (experimental API in SDK v0.2.x)
          try {
            // quickAuth returns { token, expiresAt } - SDK handles caching
            const authResult = await sdk.experimental.quickAuth();
            if (authResult?.token) {
              result.authToken = authResult.token;
              console.log('[Farcaster] Quick Auth token obtained');
            }
          } catch (authError) {
            // Quick Auth may not be available in all contexts
            console.log('[Farcaster] Quick Auth not available:', authError);
          }
          
          // STEP 4: Call ready() LAST - after getting context and auth
          try {
            await sdk.actions.ready();
            console.log('[Farcaster] SDK ready() called - splash screen hidden');
          } catch (readyError) {
            console.log('[Farcaster] SDK ready error:', readyError);
          }
        }
      } catch (e) {
        console.log('[Farcaster] SDK init error:', e);
      }
      
      if (!cancelled) {
        onReady(result);
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
  const [platformType, setPlatformType] = useState<'mobile' | 'web' | null>(null);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  // Callback to get fresh auth token (SDK handles caching)
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!isInMiniApp) return null;
    
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const authResult = await sdk.experimental.quickAuth();
      if (authResult?.token) {
        setAuthToken(authResult.token);
        return authResult.token;
      }
      return authToken; // Return cached token
    } catch (e) {
      console.log('[Farcaster] getAuthToken error:', e);
      return authToken; // Return cached token if refresh fails
    }
  }, [isInMiniApp, authToken]);
  
  const handleReady = useCallback((data: InitData) => {
    setIsInMiniApp(data.isInMiniApp);
    setPlatformType(data.platformType);
    setUser(data.user);
    setAuthToken(data.authToken);
    setIsReady(true);
    console.log('[Farcaster] Provider ready:', { 
      isInMiniApp: data.isInMiniApp, 
      user: data.user?.username,
      hasToken: !!data.authToken 
    });
  }, []);

  const contextValue = useMemo(() => ({
    isReady,
    isInMiniApp,
    platformType,
    user,
    authToken,
    isAuthenticated: !!authToken || !!user?.fid,
    getAuthToken,
    activeChain,
    isTestnet: IS_TESTNET,
  }), [isReady, isInMiniApp, platformType, user, authToken, getAuthToken]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <FarcasterContext.Provider value={contextValue}>
          <FarcasterInitializer onReady={handleReady}>
            {/* Only render AutoConnect after isReady to avoid race condition */}
            <AutoConnectWallet isReady={isReady} isInMiniApp={isInMiniApp} />
            {children}
          </FarcasterInitializer>
        </FarcasterContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
