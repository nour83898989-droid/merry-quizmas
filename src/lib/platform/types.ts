/**
 * Platform Types
 * Type definitions for platform detection and adapters
 */

export type Platform = 'farcaster' | 'base' | 'browser';

export interface UserContext {
  fid?: number;
  address?: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface WalletContext {
  provider: unknown | null;
  address: string | null;
  isConnected: boolean;
}

export interface PlatformContext {
  platform: Platform;
  user: UserContext;
  wallet: WalletContext;
  isReady: boolean;
}

export type HapticType = 
  | 'selectionChanged'
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError';

export interface ShareOptions {
  text?: string;
  url?: string;
  embedUrl?: string;
}

export interface PlatformAdapter {
  detect(): Platform;
  initialize(): Promise<void>;
  getContext(): PlatformContext;
  authenticate(): Promise<string | null>;
  getWalletProvider(): unknown | null;
  ready(): Promise<void>;
  close(): Promise<void>;
  share(options: ShareOptions): Promise<void>;
  haptic(type: HapticType): Promise<void>;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
