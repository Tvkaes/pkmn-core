// Generic in-memory cache with TTL support.
// Framework-agnostic, can be used by any consumer.
// Optimized for PokeAPI's static data patterns.

export interface CacheEntry<T> {
  data: T
  timestamp: number
  stale?: boolean
}

export interface CacheOptions {
  maxAge?: number
  maxSize?: number
  staleAge?: number // Time after maxAge when data is stale but usable
}

// PokeAPI data is static - use long TTLs
export const CACHE_PRESETS = {
  // For truly static data (pokemon stats, types, etc)
  STATIC: { maxAge: 1000 * 60 * 60 * 24 * 7, staleAge: 1000 * 60 * 60 * 24 * 30 }, // 7 days fresh, 30 days stale
  // For semi-static data (species info, forms)
  SEMI_STATIC: { maxAge: 1000 * 60 * 60 * 24, staleAge: 1000 * 60 * 60 * 24 * 7 }, // 1 day fresh, 7 days stale
  // For session-only caching
  SESSION: { maxAge: 1000 * 60 * 60, staleAge: 1000 * 60 * 60 * 4 }, // 1 hour fresh, 4 hours stale
} as const

const DEFAULT_MAX_AGE = CACHE_PRESETS.STATIC.maxAge
const DEFAULT_STALE_AGE = CACHE_PRESETS.STATIC.staleAge
const DEFAULT_MAX_SIZE = 1000

export interface CacheResult<T> {
  data: T
  isStale: boolean
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly maxAge: number
  private readonly staleAge: number
  private readonly maxSize: number

  constructor(options: CacheOptions = {}) {
    this.maxAge = options.maxAge ?? DEFAULT_MAX_AGE
    this.staleAge = options.staleAge ?? DEFAULT_STALE_AGE
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE
  }

  private getEntryStatus(entry: CacheEntry<T> | undefined): 'fresh' | 'stale' | 'expired' {
    if (!entry) return 'expired'
    const age = Date.now() - entry.timestamp
    if (age < this.maxAge) return 'fresh'
    if (age < this.staleAge) return 'stale'
    return 'expired'
  }

  private evictOldest(): void {
    if (this.cache.size < this.maxSize) return

    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  get(key: string): T | undefined {
    const result = this.getWithStatus(key)
    return result?.data
  }

  getWithStatus(key: string): CacheResult<T> | undefined {
    const entry = this.cache.get(key)
    const status = this.getEntryStatus(entry)
    
    if (status === 'expired') {
      if (entry) this.cache.delete(key)
      return undefined
    }
    
    return {
      data: entry!.data,
      isStale: status === 'stale',
    }
  }

  // Get stale data even if expired (for stale-while-revalidate)
  getStale(key: string): T | undefined {
    const entry = this.cache.get(key)
    return entry?.data
  }

  set(key: string, data: T): void {
    this.evictOldest()
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }
}

export function createCache<T>(options?: CacheOptions): MemoryCache<T> {
  return new MemoryCache<T>(options)
}

// Convenience function for creating a fetch wrapper with caching
export function withCache<T>(
  cache: MemoryCache<T>,
  keyFn: (args: unknown[]) => string,
  fetchFn: (...args: unknown[]) => Promise<T>
): (...args: unknown[]) => Promise<T> {
  return async (...args: unknown[]): Promise<T> => {
    const key = keyFn(args)
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }

    const data = await fetchFn(...args)
    cache.set(key, data)
    return data
  }
}
