// Simple in-memory cache with TTL support

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache keys
export const CACHE_KEYS = {
  QUIZ_LIST: 'quiz-list',
  QUIZ_DETAIL: (id: string) => `quiz-${id}`,
  LEADERBOARD: (id: string) => `leaderboard-${id}`,
  USER_CONTEXT: 'user-context',
} as const;

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  QUIZ_LIST: 30 * 1000, // 30 seconds
  QUIZ_DETAIL: 60 * 1000, // 1 minute
  LEADERBOARD: 10 * 1000, // 10 seconds (updates frequently)
  USER_CONTEXT: 5 * 60 * 1000, // 5 minutes
} as const;

// Helper function for cached fetch
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();
  
  // Store in cache
  cache.set(key, data, ttlMs);
  
  return data;
}
