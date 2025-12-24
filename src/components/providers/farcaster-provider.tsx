'use client';

import { useEffect, useMemo, useState, createContext, useContext, useCallback, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http, useConnect, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { base, baseSepolia } from 'viem/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';

// Use testnet based on env
const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';
const activeChain = IS_TESTNET ? baseSepolia : base;

const queryClient = new QueryClient();

// Create wagmi config with all connectors
// Order: farcasterMiniApp (index 0), coinbaseWallet (index 1), injected (index 2)
export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [
    farcasterMiniApp(),      // index 0 - for Farcaster/Warpcast
    coinbaseWallet({ appName: 'Merry Quizmas' }),  // index 1 - for Base App
    injected(),              // index 2 - for browser wallets
  ],
  ssr: true,
});

// Platform types: farcaster (Warpcast), base (Base App), browser (standalone)
type PlatformType = 'farcaster' | 'base' | 'browser';

interface FarcasterUser {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface FarcasterContextType {
  // SDK State
  isReady: boolean;
  isInMiniApp: boolean;  // true for both Farcaster AND Base App
  platform: PlatformType;  // NEW: specific platform detection
  platformType: 'mobile' | 'web' | null;  // Farcaster client type
  
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
  platform: 'browser',
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


// Auto-connect component - handles all 3 platforms
function AutoConnectWallet({ isReady, platform }: { isReady: boolean; platform: PlatformType }) {
  const { isConnected, address } = useAccount();
  const { connect, connectors, status } = useConnect();
  const [attempted, setAttempted] = useState(false);
  
  useEffect(() => {
    // Only auto-connect when:
    // 1. SDK is ready
    // 2. In a mini app (Farcaster OR Base App)
    // 3. Not already connected
    // 4. Haven't attempted yet
    // 5. Not currently connecting
    const shouldAutoConnect = isReady && platform !== 'browser' && !isConnected && !attempted && connectors.length > 0 && status !== 'pending';
    
    if (shouldAutoConnect) {
      setAttempted(true);
      
      // Select connector based on platform
      let connector;
      if (platform === 'farcaster') {
        connector = connectors[0]; // farcasterMiniApp
        console.log('[Platform] Farcaster detected, using farcasterMiniApp connector');
      } else if (platform === 'base') {
        connector = connectors[1]; // coinbaseWallet
        console.log('[Platform] Base App detected, using coinbaseWallet connector');
      }
      
      if (connector) {
        console.log('[Platform] Auto-connecting with:', connector.name);
        connect(
          { connector },
          {
            onSuccess: (data) => {
              console.log('[Platform] Auto-connect success:', data.accounts?.[0]);
            },
            onError: (error) => {
              console.error('[Platform] Auto-connect failed:', error);
              setAttempted(false); // Allow retry
            },
          }
        );
      }
    }
  }, [isReady, platform, isConnected, attempted, connect, connectors, status]);
  
  // Log connection status
  useEffect(() => {
    if (isConnected && address) {
      console.log('[Platform] Wallet connected:', address);
    }
  }, [isConnected, address]);
  
  return null;
}

interface InitData {
  platform: PlatformType;
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
        platform: 'browser',
        platformType: null,
        user: null,
        authToken: null,
      };
      
      // PARALLEL DETECTION: Check all 3 platforms
      console.log('[Platform] Starting detection...');
      
      // 1. Check Base App using MiniKit
      let isBaseApp = false;
      try {
        const { isInMiniApp } = await import('@coinbase/onchainkit/minikit');
        isBaseApp = isInMiniApp();
        if (isBaseApp) {
          console.log('[Platform] Base MiniKit detected');
        }
      } catch {
        // Fallback: Check Coinbase Wallet in-app browser
        isBaseApp = typeof window !== 'undefined' && 
          (window.ethereum as { isCoinbaseWallet?: boolean })?.isCoinbaseWallet === true;
        if (isBaseApp) {
          console.log('[Platform] Coinbase Wallet detected');
        }
      }
      
      // 2. Check Farcaster MiniApp
      let isFarcaster = false;
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        isFarcaster = await sdk.isInMiniApp().catch(() => false);
        
        if (isFarcaster) {
          result.platform = 'farcaster';
          console.log('[Platform] Farcaster MiniApp detected');
          
          // Get Farcaster user context
          try {
            const ctx = await sdk.context;
            if (ctx?.user) {
              result.user = {
                fid: ctx.user.fid,
                username: ctx.user.username,
                displayName: ctx.user.displayName,
                pfpUrl: ctx.user.pfpUrl,
              };
              console.log('[Platform] Farcaster user:', result.user?.username);
            }
            
            // Get platform type (mobile or web/desktop)
            if (ctx?.client?.clientFid) {
              result.platformType = 'mobile';
            } else {
              result.platformType = 'web';
            }
          } catch (ctxError) {
            console.log('[Platform] Farcaster context error:', ctxError);
          }
          
          // Get Quick Auth token
          try {
            const authResult = await sdk.experimental.quickAuth();
            if (authResult?.token) {
              result.authToken = authResult.token;
              console.log('[Platform] Farcaster Quick Auth obtained');
            }
          } catch (authError) {
            console.log('[Platform] Quick Auth not available:', authError);
          }
          
          // Call ready() to hide splash screen
          try {
            await sdk.actions.ready();
            console.log('[Platform] Farcaster SDK ready() called');
          } catch (readyError) {
            console.log('[Platform] SDK ready error:', readyError);
          }
        }
      } catch (e) {
        console.log('[Platform] Farcaster SDK not available:', e);
      }
      
      // 3. Determine final platform (Farcaster takes priority if both detected)
      if (isFarcaster) {
        result.platform = 'farcaster';
      } else if (isBaseApp) {
        result.platform = 'base';
        console.log('[Platform] Base App detected');
      } else {
        result.platform = 'browser';
        console.log('[Platform] Browser detected');
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
  const [platform, setPlatform] = useState<PlatformType>('browser');
  const [platformType, setPlatformType] = useState<'mobile' | 'web' | null>(null);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  // isInMiniApp = true for both Farcaster AND Base App (not browser)
  const isInMiniApp = platform !== 'browser';
  
  // Callback to get fresh auth token (SDK handles caching)
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (platform !== 'farcaster') return null;
    
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const authResult = await sdk.experimental.quickAuth();
      if (authResult?.token) {
        setAuthToken(authResult.token);
        return authResult.token;
      }
      return authToken;
    } catch (e) {
      console.log('[Platform] getAuthToken error:', e);
      return authToken;
    }
  }, [platform, authToken]);
  
  const handleReady = useCallback((data: InitData) => {
    setPlatform(data.platform);
    setPlatformType(data.platformType);
    setUser(data.user);
    setAuthToken(data.authToken);
    setIsReady(true);
    console.log('[Platform] Provider ready:', { 
      platform: data.platform,
      user: data.user?.username,
      hasToken: !!data.authToken 
    });
  }, []);

  const contextValue = useMemo(() => ({
    isReady,
    isInMiniApp,
    platform,
    platformType,
    user,
    authToken,
    isAuthenticated: !!authToken || !!user?.fid,
    getAuthToken,
    activeChain,
    isTestnet: IS_TESTNET,
  }), [isReady, isInMiniApp, platform, platformType, user, authToken, getAuthToken]);

  return (
    <MiniKitProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <FarcasterContext.Provider value={contextValue}>
            <FarcasterInitializer onReady={handleReady}>
              <AutoConnectWallet isReady={isReady} platform={platform} />
              {children}
            </FarcasterInitializer>
          </FarcasterContext.Provider>
        </QueryClientProvider>
      </WagmiProvider>
    </MiniKitProvider>
  );
}
