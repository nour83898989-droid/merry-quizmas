/**
 * Farcaster Platform Adapter
 * Implements platform adapter for Farcaster Mini App (Warpcast)
 */

import type { 
  PlatformAdapter, 
  PlatformContext, 
  HapticType, 
  ShareOptions 
} from './types';
import { fetchUserByAddress, fetchUserByFid } from '@/lib/neynar/client';

// Farcaster SDK types (simplified)
interface FarcasterContext {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  client?: {
    safeAreaInsets?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
}

interface FarcasterSDK {
  context: FarcasterContext | null;
  actions: {
    ready: () => Promise<void>;
    close: () => Promise<void>;
    composeCast: (options: { text?: string; embeds?: string[] }) => Promise<void>;
    swapToken?: (options: unknown) => Promise<void>;
  };
  wallet: {
    getEthereumProvider: () => Promise<unknown>;
  };
  quickAuth: {
    getToken: () => Promise<string>;
  };
  haptics: {
    selectionChanged: () => Promise<void>;
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => Promise<void>;
    notificationOccurred: (type: 'success' | 'warning' | 'error') => Promise<void>;
  };
  getCapabilities: () => Promise<{ haptics?: boolean }>;
}

let sdk: FarcasterSDK | null = null;

async function getSDK(): Promise<FarcasterSDK> {
  if (sdk) return sdk;
  
  // Dynamic import of Farcaster SDK
  const { default: farcasterSDK } = await import('@farcaster/frame-sdk');
  sdk = farcasterSDK as unknown as FarcasterSDK;
  return sdk;
}

export class FarcasterAdapter implements PlatformAdapter {
  private context: PlatformContext = {
    platform: 'farcaster',
    user: {},
    wallet: {
      provider: null,
      address: null,
      isConnected: false,
    },
    isReady: false,
  };

  private walletProvider: unknown | null = null;
  private authToken: string | null = null;

  detect() {
    return 'farcaster' as const;
  }

  async initialize(): Promise<void> {
    try {
      const farcasterSDK = await getSDK();
      
      // Get user context from SDK
      if (farcasterSDK.context?.user) {
        this.context.user = {
          fid: farcasterSDK.context.user.fid,
          username: farcasterSDK.context.user.username,
          displayName: farcasterSDK.context.user.displayName,
          pfpUrl: farcasterSDK.context.user.pfpUrl,
        };
      }

      // Get wallet provider
      try {
        this.walletProvider = await farcasterSDK.wallet.getEthereumProvider();
        if (this.walletProvider) {
          this.context.wallet.provider = this.walletProvider;
          this.context.wallet.isConnected = true;
          
          // Get wallet address
          const provider = this.walletProvider as { request: (args: { method: string }) => Promise<string[]> };
          const accounts = await provider.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            this.context.wallet.address = accounts[0];
            this.context.user.address = accounts[0];
            
            // If we have wallet but no user info, lookup via Neynar
            if (!this.context.user.fid || !this.context.user.username) {
              await this.lookupUserByAddress(accounts[0]);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to get Farcaster wallet provider:', e);
      }

      // If still no user info but have FID, fetch from Neynar
      if (this.context.user.fid && !this.context.user.username) {
        await this.lookupUserByFid(this.context.user.fid);
      }

      this.context.isReady = true;
    } catch (e) {
      console.error('Failed to initialize Farcaster adapter:', e);
      throw e;
    }
  }

  /**
   * Lookup Farcaster user by wallet address via Neynar API
   */
  private async lookupUserByAddress(address: string): Promise<void> {
    try {
      const neynarUser = await fetchUserByAddress(address);
      if (neynarUser) {
        this.context.user = {
          ...this.context.user,
          fid: neynarUser.fid,
          username: neynarUser.username,
          displayName: neynarUser.displayName,
          pfpUrl: neynarUser.pfpUrl,
          address: address,
        };
      }
    } catch (e) {
      console.warn('Neynar lookup by address failed:', e);
    }
  }

  /**
   * Lookup Farcaster user by FID via Neynar API
   */
  private async lookupUserByFid(fid: number): Promise<void> {
    try {
      const neynarUser = await fetchUserByFid(fid);
      if (neynarUser) {
        this.context.user = {
          ...this.context.user,
          fid: neynarUser.fid,
          username: this.context.user.username || neynarUser.username,
          displayName: this.context.user.displayName || neynarUser.displayName,
          pfpUrl: this.context.user.pfpUrl || neynarUser.pfpUrl,
        };
      }
    } catch (e) {
      console.warn('Neynar lookup by FID failed:', e);
    }
  }

  getContext(): PlatformContext {
    return this.context;
  }

  async authenticate(): Promise<string | null> {
    if (this.authToken) return this.authToken;

    try {
      const farcasterSDK = await getSDK();
      this.authToken = await farcasterSDK.quickAuth.getToken();
      return this.authToken;
    } catch (e) {
      console.error('Failed to authenticate with Farcaster:', e);
      return null;
    }
  }

  getWalletProvider(): unknown | null {
    return this.walletProvider;
  }

  async ready(): Promise<void> {
    try {
      const farcasterSDK = await getSDK();
      await farcasterSDK.actions.ready();
    } catch (e) {
      console.error('Failed to signal ready to Farcaster:', e);
    }
  }

  async close(): Promise<void> {
    try {
      const farcasterSDK = await getSDK();
      await farcasterSDK.actions.close();
    } catch (e) {
      console.error('Failed to close Farcaster Mini App:', e);
    }
  }

  async share(options: ShareOptions): Promise<void> {
    try {
      const farcasterSDK = await getSDK();
      const embeds: string[] = [];
      
      if (options.url) embeds.push(options.url);
      if (options.embedUrl) embeds.push(options.embedUrl);

      await farcasterSDK.actions.composeCast({
        text: options.text,
        embeds: embeds.length > 0 ? embeds : undefined,
      });
    } catch (e) {
      console.error('Failed to share via Farcaster:', e);
    }
  }

  async haptic(type: HapticType): Promise<void> {
    try {
      const farcasterSDK = await getSDK();
      
      // Check if haptics are supported
      const capabilities = await farcasterSDK.getCapabilities();
      if (!capabilities.haptics) return;

      switch (type) {
        case 'selectionChanged':
          await farcasterSDK.haptics.selectionChanged();
          break;
        case 'impactLight':
          await farcasterSDK.haptics.impactOccurred('light');
          break;
        case 'impactMedium':
          await farcasterSDK.haptics.impactOccurred('medium');
          break;
        case 'impactHeavy':
          await farcasterSDK.haptics.impactOccurred('heavy');
          break;
        case 'notificationSuccess':
          await farcasterSDK.haptics.notificationOccurred('success');
          break;
        case 'notificationWarning':
          await farcasterSDK.haptics.notificationOccurred('warning');
          break;
        case 'notificationError':
          await farcasterSDK.haptics.notificationOccurred('error');
          break;
      }
    } catch (e) {
      // Haptics may not be available on all devices
      console.debug('Haptic feedback not available:', e);
    }
  }
}
