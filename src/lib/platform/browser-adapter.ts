/**
 * Browser Platform Adapter
 * Fallback adapter for standalone browser usage with standard Web3 wallet connection
 */

import type { 
  PlatformAdapter, 
  PlatformContext, 
  HapticType, 
  ShareOptions 
} from './types';
import { fetchUserByAddress } from '@/lib/neynar/client';

const SESSION_KEY = 'quiz_app_session';
const FC_USER_KEY = 'fc_user';

interface StoredSession {
  address: string;
  timestamp: number;
}

interface StoredFcUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export class BrowserAdapter implements PlatformAdapter {
  private context: PlatformContext = {
    platform: 'browser',
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
    return 'browser' as const;
  }

  async initialize(): Promise<void> {
    try {
      // Check for stored session
      this.loadSession();
      this.loadFcUser();

      // Check for injected wallet provider (MetaMask, etc.)
      if (typeof window !== 'undefined' && 'ethereum' in window) {
        this.walletProvider = (window as { ethereum: unknown }).ethereum;
        this.context.wallet.provider = this.walletProvider;

        // Check if already connected
        try {
          const provider = this.walletProvider as { 
            request: (args: { method: string }) => Promise<string[]> 
          };
          const accounts = await provider.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            this.context.wallet.address = accounts[0];
            this.context.wallet.isConnected = true;
            this.context.user.address = accounts[0];
            this.saveSession(accounts[0]);
            
            // Lookup Farcaster user by wallet address if not cached
            if (!this.context.user.fid) {
              await this.lookupUserByAddress(accounts[0]);
            }
          }
        } catch (e) {
          console.debug('No connected accounts:', e);
        }
      }

      this.context.isReady = true;
    } catch (e) {
      console.error('Failed to initialize browser adapter:', e);
      this.context.isReady = true; // Still mark as ready, just without wallet
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
        this.saveFcUser({
          fid: neynarUser.fid,
          username: neynarUser.username,
          displayName: neynarUser.displayName,
          pfpUrl: neynarUser.pfpUrl,
        });
      }
    } catch (e) {
      console.warn('Neynar lookup by address failed:', e);
    }
  }

  private loadFcUser(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(FC_USER_KEY);
      if (stored) {
        const fcUser: StoredFcUser = JSON.parse(stored);
        if (fcUser.fid) {
          this.context.user.fid = fcUser.fid;
          this.context.user.username = fcUser.username;
          this.context.user.displayName = fcUser.displayName;
          this.context.user.pfpUrl = fcUser.pfpUrl;
        }
      }
    } catch (e) {
      console.debug('Failed to load FC user:', e);
    }
  }

  private saveFcUser(user: StoredFcUser): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(FC_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.debug('Failed to save FC user:', e);
    }
  }

  private loadSession(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const session: StoredSession = JSON.parse(stored);
        
        // Check if session is still valid (24 hours)
        const isValid = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;
        
        if (isValid) {
          this.context.user.address = session.address;
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {
      console.debug('Failed to load session:', e);
    }
  }

  private saveSession(address: string): void {
    if (typeof window === 'undefined') return;

    try {
      const session: StoredSession = {
        address,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.debug('Failed to save session:', e);
    }
  }

  getContext(): PlatformContext {
    return this.context;
  }

  async authenticate(): Promise<string | null> {
    // Browser doesn't have built-in auth like Farcaster
    // Return the wallet address as identifier
    return this.context.wallet.address;
  }

  getWalletProvider(): unknown | null {
    return this.walletProvider;
  }

  /**
   * Connect wallet using injected provider
   */
  async connectWallet(): Promise<string | null> {
    if (!this.walletProvider) {
      console.error('No wallet provider available');
      return null;
    }

    try {
      const provider = this.walletProvider as { 
        request: (args: { method: string }) => Promise<string[]> 
      };
      
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length > 0) {
        this.context.wallet.address = accounts[0];
        this.context.wallet.isConnected = true;
        this.context.user.address = accounts[0];
        this.saveSession(accounts[0]);
        
        // Lookup Farcaster user by wallet address
        await this.lookupUserByAddress(accounts[0]);
        
        return accounts[0];
      }

      return null;
    } catch (e) {
      console.error('Failed to connect wallet:', e);
      return null;
    }
  }

  async ready(): Promise<void> {
    // No-op for browser - always ready
    this.context.isReady = true;
  }

  async close(): Promise<void> {
    // No-op for browser - can't close the tab programmatically
    console.debug('Close action not available in browser');
  }

  async share(options: ShareOptions): Promise<void> {
    // Use Web Share API if available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Quiz Result',
          text: options.text,
          url: options.url || options.embedUrl,
        });
        return;
      } catch (e) {
        // User cancelled or share failed, fall through to clipboard
        console.debug('Web Share failed, falling back to clipboard:', e);
      }
    }

    // Fallback: copy to clipboard
    const shareText = [options.text, options.url || options.embedUrl]
      .filter(Boolean)
      .join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        // Could show a toast notification here
      } catch (e) {
        console.error('Failed to copy to clipboard:', e);
      }
    }
  }

  async haptic(type: HapticType): Promise<void> {
    // Use Vibration API if available
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
        // Vibration not available or not permitted
        console.debug('Vibration not available:', e);
      }
    }
  }
}
