// Persistent cache implementations for browser environments.
// Uses localStorage for small data and IndexedDB for larger datasets.

import type { CacheEntry, CacheOptions, CacheResult } from './memory'
import { CACHE_PRESETS } from './memory'

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  keys(): Promise<string[]>
  clear(): Promise<void>
}

// localStorage adapter (sync but wrapped as async for consistency)
export const localStorageAdapter: StorageAdapter = {
  async getItem(key: string) {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, value)
  },
  async removeItem(key: string) {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(key)
  },
  async keys() {
    if (typeof localStorage === 'undefined') return []
    return Object.keys(localStorage)
  },
  async clear() {
    if (typeof localStorage === 'undefined') return
    localStorage.clear()
  },
}

// IndexedDB adapter for larger datasets
export function createIndexedDBAdapter(dbName: string, storeName: string): StorageAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null

  function getDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise

    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'))
        return
      }

      const request = indexedDB.open(dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName)
        }
      }
    })

    return dbPromise
  }

  return {
    async getItem(key: string) {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.get(key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result ?? null)
      })
    },

    async setItem(key: string, value: string) {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const request = store.put(value, key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    },

    async removeItem(key: string) {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const request = store.delete(key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    },

    async keys() {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.getAllKeys()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result.map(String))
      })
    },

    async clear() {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const request = store.clear()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    },
  }
}

export interface PersistentCacheOptions extends CacheOptions {
  prefix?: string
  storage?: StorageAdapter
}

export class PersistentCache<T> {
  private readonly prefix: string
  private readonly storage: StorageAdapter
  private readonly maxAge: number
  private readonly staleAge: number
  private readonly maxSize: number
  private memoryCache = new Map<string, CacheEntry<T>>()

  constructor(options: PersistentCacheOptions = {}) {
    this.prefix = options.prefix ?? 'pkmn-cache:'
    this.storage = options.storage ?? localStorageAdapter
    this.maxAge = options.maxAge ?? CACHE_PRESETS.STATIC.maxAge
    this.staleAge = options.staleAge ?? CACHE_PRESETS.STATIC.staleAge
    this.maxSize = options.maxSize ?? 500
  }

  private getStorageKey(key: string): string {
    return `${this.prefix}${key}`
  }

  private getEntryStatus(entry: CacheEntry<T> | undefined): 'fresh' | 'stale' | 'expired' {
    if (!entry) return 'expired'
    const age = Date.now() - entry.timestamp
    if (age < this.maxAge) return 'fresh'
    if (age < this.staleAge) return 'stale'
    return 'expired'
  }

  async get(key: string): Promise<T | undefined> {
    const result = await this.getWithStatus(key)
    return result?.data
  }

  async getWithStatus(key: string): Promise<CacheResult<T> | undefined> {
    // Check memory first
    const memEntry = this.memoryCache.get(key)
    if (memEntry) {
      const status = this.getEntryStatus(memEntry)
      if (status !== 'expired') {
        return { data: memEntry.data, isStale: status === 'stale' }
      }
    }

    // Check persistent storage
    try {
      const stored = await this.storage.getItem(this.getStorageKey(key))
      if (!stored) return undefined

      const entry: CacheEntry<T> = JSON.parse(stored)
      const status = this.getEntryStatus(entry)

      if (status === 'expired') {
        await this.storage.removeItem(this.getStorageKey(key))
        return undefined
      }

      // Hydrate memory cache
      this.memoryCache.set(key, entry)

      return { data: entry.data, isStale: status === 'stale' }
    } catch {
      return undefined
    }
  }

  async getStale(key: string): Promise<T | undefined> {
    // Memory first
    const memEntry = this.memoryCache.get(key)
    if (memEntry) return memEntry.data

    // Then storage
    try {
      const stored = await this.storage.getItem(this.getStorageKey(key))
      if (!stored) return undefined
      const entry: CacheEntry<T> = JSON.parse(stored)
      return entry.data
    } catch {
      return undefined
    }
  }

  async set(key: string, data: T): Promise<void> {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }

    // Set in memory
    this.memoryCache.set(key, entry)

    // Evict if over size
    if (this.memoryCache.size > this.maxSize) {
      const keys = Array.from(this.memoryCache.keys())
      const oldest = keys[0]
      if (oldest) this.memoryCache.delete(oldest)
    }

    // Persist
    try {
      await this.storage.setItem(this.getStorageKey(key), JSON.stringify(entry))
    } catch {
      // Storage full or unavailable - continue with memory only
    }
  }

  async delete(key: string): Promise<boolean> {
    this.memoryCache.delete(key)
    try {
      await this.storage.removeItem(this.getStorageKey(key))
      return true
    } catch {
      return false
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear()
    try {
      const keys = await this.storage.keys()
      const prefixedKeys = keys.filter((k) => k.startsWith(this.prefix))
      await Promise.all(prefixedKeys.map((k) => this.storage.removeItem(k)))
    } catch {
      // Ignore storage errors
    }
  }

  has(key: string): boolean {
    return this.memoryCache.has(key)
  }

  size(): number {
    return this.memoryCache.size
  }
}

export function createPersistentCache<T>(options?: PersistentCacheOptions): PersistentCache<T> {
  return new PersistentCache<T>(options)
}

export function createIndexedDBCache<T>(
  dbName = 'pkmn-core',
  storeName = 'cache',
  options?: Omit<PersistentCacheOptions, 'storage'>
): PersistentCache<T> {
  return new PersistentCache<T>({
    ...options,
    storage: createIndexedDBAdapter(dbName, storeName),
  })
}
