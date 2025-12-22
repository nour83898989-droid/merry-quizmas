/**
 * Base App Platform Adapter
 * Implements platform adapter for Base App Mini App using MiniKit and OnchainKit
 */

import type { 
  PlatformAdapter, 
  PlatformContext, 
  HapticType, 
  ShareOptions 
} from './types';

// MiniKit context types (simplified)
interface MiniKitContext {
  user?: {
    fid?: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    address?: string;
  };
}

export class BaseAppAdapter implements PlatformAdapter {
  private context: PlatformContext = {
    platform: 'base',
    user: {},
    wallet: {
      provider: null,
      address: null,
      isConnected: false,
    },
    isReady: false,
  };

  private walletProvider: unknown | null = null;

  detect() {
    return 'base' as const;
  }

  async initialize(): Promise<void> {
    try {
      // MiniKit initialization is handled by the provider wrapper
      // We'll get context from the useMiniKit hook in React components
      
      // For now, mark as ready - actual context will be populated
      // when React components mount and use the hooks
      this.context.isReady = true;
    } catch (e) {
      console.error('Failed to initialize Base App adapter:', e);
      throw e;
    }
  }

  /**
   * Update context from MiniKit hook data
   * Called from React components that have access to useMiniKit
   */
  updateFromMiniKit(miniKitContext: MiniKitContext): void {
    if (miniKitContext.user) {
      this.context.user = {
        fid: miniKitContext.user.fid,
        username: miniKitContext.user.username,
        displayName: miniKitContext.user.displayName,
        pfpUrl: miniKitContext.user.pfpUrl,
        address: miniKitContext.user.address,
      };
      
      if (miniKitContext.user.address) {
        this.context.wallet.address = miniKitContext.user.address;
        this.context.wallet.isConnected = true;
      }
    }
  }

  getContext(): PlatformContext {
    return this.context;
  }

  async authenticate(): Promise<string | null> {
    // Base App uses SIWF (Sign In With Farcaster) via useAuthenticate hook
    // Authentication is deferred until an action requires it
    // The actual auth flow is handled by OnchainKit components
    
    // Return null here - actual auth is handled by React hooks
    return null;
  }

  getWalletProvider(): unknown | null {
    return this.walletProvider;
  }

  setWalletProvider(provider: unknown): void {
    this.walletProvider = provider;
    this.context.wallet.provider = provider;
  }

  async ready(): Promise<void> {
    // Signal ready state to Base App
    // This is typically handled by MiniKit provider
    this.context.isReady = true;
  }

  async close(): Promise<void> {
    // Base App doesn't have a close action like Farcaster
    // Navigation is handled by the app itself
    console.debug('Close action not available in Base App');
  }

  async share(options: ShareOptions): Promise<void> {
    // Use Web Share API as fallback for Base App
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Quiz Result',
          text: options.text,
          url: options.url || options.embedUrl,
        });
      } catch (e) {
        // User cancelled or share failed
        console.debug('Share cancelled or failed:', e);
      }
    } else {
      // Fallback: copy to clipboard
      const shareText = [options.text, options.url || options.embedUrl]
        .filter(Boolean)
        .join('\n');
      
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
      }
    }
  }

  async haptic(type: HapticType): Promise<void> {
    // Use Vibration API as fallback for Base App
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        switch (type) {
          case 'selectionChanged':
            navigator.vibrate(10);
            break;
          case 'impactLight':
            navigator.vibrate(20);
            break;
          case 'impactMedium':
            navigator.vibrate(40);
            break;
          case 'impactHeavy':
            navigator.vibrate(60);
            break;
          case 'notificationSuccess':
            navigator.vibrate([30, 50, 30]);
            break;
          case 'notificationWarning':
            navigator.vibrate([50, 30, 50]);
            break;
          case 'notificationError':
            navigator.vibrate([100, 50, 100]);
            break;
        }
      } catch (e) {
        console.debug('Vibration not available:', e);
      }
    }
  }
}
