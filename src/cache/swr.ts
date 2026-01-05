// Stale-While-Revalidate pattern implementation.
// Returns cached data immediately while fetching fresh data in background.

import type { CacheResult } from './memory'
import { MemoryCache, CACHE_PRESETS } from './memory'
import { PersistentCache } from './storage'

export interface SWROptions {
  dedupe?: boolean // Dedupe concurrent requests for same key
  dedupeInterval?: number // Time window for deduplication (ms)
  onError?: (error: unknown, key: string) => void
  onSuccess?: (data: unknown, key: string, isRevalidation: boolean) => void
}

type CacheInterface<T> = {
  get(key: string): T | undefined | Promise<T | undefined>
  getWithStatus(key: string): CacheResult<T> | undefined | Promise<CacheResult<T> | undefined>
  getStale(key: string): T | undefined | Promise<T | undefined>
  set(key: string, data: T): void | Promise<void>
}

export class SWRCache<T> {
  private cache: CacheInterface<T>
  private inflight = new Map<string, Promise<T>>()
  private lastFetch = new Map<string, number>()
  private readonly dedupe: boolean
  private readonly dedupeInterval: number
  private readonly onError?: (error: unknown, key: string) => void
  private readonly onSuccess?: (data: unknown, key: string, isRevalidation: boolean) => void

  constructor(cache: CacheInterface<T>, options: SWROptions = {}) {
    this.cache = cache
    this.dedupe = options.dedupe ?? true
    this.dedupeInterval = options.dedupeInterval ?? 2000
    this.onError = options.onError
    this.onSuccess = options.onSuccess
  }

  private shouldDedupe(key: string): boolean {
    if (!this.dedupe) return false
    const last = this.lastFetch.get(key)
    if (!last) return false
    return Date.now() - last < this.dedupeInterval
  }

  async get(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Check cache first
    const cached = await this.cache.getWithStatus(key)

    if (cached && !cached.isStale) {
      // Fresh data - return immediately
      return cached.data
    }

    // Check for inflight request
    const inflight = this.inflight.get(key)
    if (inflight) {
      // Return stale data if available, otherwise wait for inflight
      if (cached) return cached.data
      return inflight
    }

    // Check dedupe
    if (this.shouldDedupe(key)) {
      const stale = await this.cache.getStale(key)
      if (stale !== undefined) return stale
    }

    // Need to fetch
    const fetchPromise = this.fetch(key, fetcher, !!cached)

    // If we have stale data, return it immediately
    if (cached) {
      // Revalidate in background
      fetchPromise.catch(() => {
        // Error handled in fetch()
      })
      return cached.data
    }

    // No cached data - must wait for fetch
    return fetchPromise
  }

  private async fetch(
    key: string,
    fetcher: () => Promise<T>,
    isRevalidation: boolean
  ): Promise<T> {
    this.lastFetch.set(key, Date.now())

    const promise = fetcher()
    this.inflight.set(key, promise)

    try {
      const data = await promise
      await this.cache.set(key, data)
      this.onSuccess?.(data, key, isRevalidation)
      return data
    } catch (error) {
      this.onError?.(error, key)
      throw error
    } finally {
      this.inflight.delete(key)
    }
  }

  async revalidate(key: string, fetcher: () => Promise<T>): Promise<T> {
    return this.fetch(key, fetcher, true)
  }

  async mutate(key: string, data: T): Promise<void> {
    await this.cache.set(key, data)
  }

  isValidating(key: string): boolean {
    return this.inflight.has(key)
  }
}

export function createSWR<T>(
  cache?: CacheInterface<T>,
  options?: SWROptions
): SWRCache<T> {
  const defaultCache = new MemoryCache<T>(CACHE_PRESETS.STATIC)
  return new SWRCache<T>(cache ?? defaultCache, options)
}

export function createPersistentSWR<T>(
  cache: PersistentCache<T>,
  options?: SWROptions
): SWRCache<T> {
  return new SWRCache<T>(cache, options)
}

// Convenience function for PokeAPI-style fetching
export function createPokeAPIFetcher<T>(
  baseUrl: string,
  cache?: CacheInterface<T>,
  options?: SWROptions
): (endpoint: string) => Promise<T> {
  const swr = createSWR<T>(cache, options)

  return async (endpoint: string): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`
    const key = url

    return swr.get(key, async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response.json() as Promise<T>
    })
  }
}
