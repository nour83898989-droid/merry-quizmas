/**
 * Platform Module
 * Exports platform detection and adapters
 */

export * from './types';
export * from './detect';
export { FarcasterAdapter } from './farcaster-adapter';
export { BaseAppAdapter } from './base-adapter';
export { BrowserAdapter } from './browser-adapter';

import { detectPlatform } from './detect';
import { FarcasterAdapter } from './farcaster-adapter';
import { BaseAppAdapter } from './base-adapter';
import { BrowserAdapter } from './browser-adapter';
import type { PlatformAdapter, Platform } from './types';

/**
 * Create the appropriate platform adapter based on detected platform
 */
export function createPlatformAdapter(platform?: Platform): PlatformAdapter {
  const detectedPlatform = platform || detectPlatform();
  
  switch (detectedPlatform) {
    case 'farcaster':
      return new FarcasterAdapter();
    case 'base':
      return new BaseAppAdapter();
    case 'browser':
    default:
      return new BrowserAdapter();
  }
}

/**
 * Singleton instance of platform adapter
 */
let adapterInstance: PlatformAdapter | null = null;

/**
 * Get or create the platform adapter singleton
 */
export function getPlatformAdapter(): PlatformAdapter {
  if (!adapterInstance) {
    adapterInstance = createPlatformAdapter();
  }
  return adapterInstance;
}

/**
 * Initialize the platform adapter
 * Should be called once when the app starts
 */
export async function initializePlatform(): Promise<PlatformAdapter> {
  const adapter = getPlatformAdapter();
  await adapter.initialize();
  return adapter;
}
