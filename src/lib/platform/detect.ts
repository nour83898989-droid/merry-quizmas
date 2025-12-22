/**
 * Platform Detection Utility
 * Detects whether the app is running in Farcaster, Base App, or standalone browser
 */

import type { Platform } from './types';

/**
 * Check if running inside Farcaster Mini App (Warpcast)
 */
export function isInFarcaster(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for Farcaster SDK context
  // The SDK sets window.parent !== window when in iframe
  // and provides specific context
  try {
    // Check URL params for fc context
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fc_context')) return true;
    
    // Check if embedded in Warpcast iframe
    if (window.parent !== window) {
      // Additional check for Farcaster-specific indicators
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('warpcast')) return true;
    }
    
    // Check for Farcaster SDK global
    if ('farcaster' in window) return true;
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if running inside Base App Mini App
 */
export function isInBaseApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check URL params for Base App context
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('base_context')) return true;
    
    // Check user agent for Base App
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('base')) return true;
    
    // Check for MiniKit context in window
    if ('coinbase' in window || 'minikit' in window) return true;
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Detect the current platform
 * Priority: Farcaster > Base App > Browser
 */
export function detectPlatform(): Platform {
  // Server-side rendering - default to browser
  if (typeof window === 'undefined') return 'browser';
  
  // Check Farcaster first (most specific)
  if (isInFarcaster()) return 'farcaster';
  
  // Check Base App
  if (isInBaseApp()) return 'base';
  
  // Default to browser
  return 'browser';
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: Platform): string {
  switch (platform) {
    case 'farcaster':
      return 'Farcaster';
    case 'base':
      return 'Base App';
    case 'browser':
      return 'Browser';
  }
}
