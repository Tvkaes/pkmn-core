// src/cache/memory.ts
var CACHE_PRESETS = {
  // For truly static data (pokemon stats, types, etc)
  STATIC: { maxAge: 1e3 * 60 * 60 * 24 * 7, staleAge: 1e3 * 60 * 60 * 24 * 30 },
  // 7 days fresh, 30 days stale
  // For semi-static data (species info, forms)
  SEMI_STATIC: { maxAge: 1e3 * 60 * 60 * 24, staleAge: 1e3 * 60 * 60 * 24 * 7 },
  // 1 day fresh, 7 days stale
  // For session-only caching
  SESSION: { maxAge: 1e3 * 60 * 60, staleAge: 1e3 * 60 * 60 * 4 }
  // 1 hour fresh, 4 hours stale
};
var DEFAULT_MAX_AGE = CACHE_PRESETS.STATIC.maxAge;
var DEFAULT_STALE_AGE = CACHE_PRESETS.STATIC.staleAge;
var DEFAULT_MAX_SIZE = 1e3;
var MemoryCache = class {
  constructor(options = {}) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxAge = options.maxAge ?? DEFAULT_MAX_AGE;
    this.staleAge = options.staleAge ?? DEFAULT_STALE_AGE;
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  }
  getEntryStatus(entry) {
    if (!entry) return "expired";
    const age = Date.now() - entry.timestamp;
    if (age < this.maxAge) return "fresh";
    if (age < this.staleAge) return "stale";
    return "expired";
  }
  evictOldest() {
    if (this.cache.size < this.maxSize) return;
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  get(key) {
    const result = this.getWithStatus(key);
    return result?.data;
  }
  getWithStatus(key) {
    const entry = this.cache.get(key);
    const status = this.getEntryStatus(entry);
    if (status === "expired") {
      if (entry) this.cache.delete(key);
      return void 0;
    }
    return {
      data: entry.data,
      isStale: status === "stale"
    };
  }
  // Get stale data even if expired (for stale-while-revalidate)
  getStale(key) {
    const entry = this.cache.get(key);
    return entry?.data;
  }
  set(key, data) {
    this.evictOldest();
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  has(key) {
    return this.get(key) !== void 0;
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  size() {
    return this.cache.size;
  }
  keys() {
    return Array.from(this.cache.keys());
  }
};
function createCache(options) {
  return new MemoryCache(options);
}
function withCache(cache, keyFn, fetchFn) {
  return async (...args) => {
    const key = keyFn(args);
    const cached = cache.get(key);
    if (cached !== void 0) {
      return cached;
    }
    const data = await fetchFn(...args);
    cache.set(key, data);
    return data;
  };
}

// src/cache/storage.ts
var localStorageAdapter = {
  async getItem(key) {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
  async keys() {
    if (typeof localStorage === "undefined") return [];
    return Object.keys(localStorage);
  },
  async clear() {
    if (typeof localStorage === "undefined") return;
    localStorage.clear();
  }
};
function createIndexedDBAdapter(dbName, storeName) {
  let dbPromise = null;
  function getDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB not available"));
        return;
      }
      const request = indexedDB.open(dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
    });
    return dbPromise;
  }
  return {
    async getItem(key) {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result ?? null);
      });
    },
    async setItem(key, value) {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
    async removeItem(key) {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    },
    async keys() {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result.map(String));
      });
    },
    async clear() {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  };
}
var PersistentCache = class {
  constructor(options = {}) {
    this.memoryCache = /* @__PURE__ */ new Map();
    this.prefix = options.prefix ?? "pkmn-cache:";
    this.storage = options.storage ?? localStorageAdapter;
    this.maxAge = options.maxAge ?? CACHE_PRESETS.STATIC.maxAge;
    this.staleAge = options.staleAge ?? CACHE_PRESETS.STATIC.staleAge;
    this.maxSize = options.maxSize ?? 500;
  }
  getStorageKey(key) {
    return `${this.prefix}${key}`;
  }
  getEntryStatus(entry) {
    if (!entry) return "expired";
    const age = Date.now() - entry.timestamp;
    if (age < this.maxAge) return "fresh";
    if (age < this.staleAge) return "stale";
    return "expired";
  }
  async get(key) {
    const result = await this.getWithStatus(key);
    return result?.data;
  }
  async getWithStatus(key) {
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      const status = this.getEntryStatus(memEntry);
      if (status !== "expired") {
        return { data: memEntry.data, isStale: status === "stale" };
      }
    }
    try {
      const stored = await this.storage.getItem(this.getStorageKey(key));
      if (!stored) return void 0;
      const entry = JSON.parse(stored);
      const status = this.getEntryStatus(entry);
      if (status === "expired") {
        await this.storage.removeItem(this.getStorageKey(key));
        return void 0;
      }
      this.memoryCache.set(key, entry);
      return { data: entry.data, isStale: status === "stale" };
    } catch {
      return void 0;
    }
  }
  async getStale(key) {
    const memEntry = this.memoryCache.get(key);
    if (memEntry) return memEntry.data;
    try {
      const stored = await this.storage.getItem(this.getStorageKey(key));
      if (!stored) return void 0;
      const entry = JSON.parse(stored);
      return entry.data;
    } catch {
      return void 0;
    }
  }
  async set(key, data) {
    const entry = { data, timestamp: Date.now() };
    this.memoryCache.set(key, entry);
    if (this.memoryCache.size > this.maxSize) {
      const keys = Array.from(this.memoryCache.keys());
      const oldest = keys[0];
      if (oldest) this.memoryCache.delete(oldest);
    }
    try {
      await this.storage.setItem(this.getStorageKey(key), JSON.stringify(entry));
    } catch {
    }
  }
  async delete(key) {
    this.memoryCache.delete(key);
    try {
      await this.storage.removeItem(this.getStorageKey(key));
      return true;
    } catch {
      return false;
    }
  }
  async clear() {
    this.memoryCache.clear();
    try {
      const keys = await this.storage.keys();
      const prefixedKeys = keys.filter((k) => k.startsWith(this.prefix));
      await Promise.all(prefixedKeys.map((k) => this.storage.removeItem(k)));
    } catch {
    }
  }
  has(key) {
    return this.memoryCache.has(key);
  }
  size() {
    return this.memoryCache.size;
  }
};
function createPersistentCache(options) {
  return new PersistentCache(options);
}
function createIndexedDBCache(dbName = "pkmn-core", storeName = "cache", options) {
  return new PersistentCache({
    ...options,
    storage: createIndexedDBAdapter(dbName, storeName)
  });
}

// src/cache/swr.ts
var SWRCache = class {
  constructor(cache, options = {}) {
    this.inflight = /* @__PURE__ */ new Map();
    this.lastFetch = /* @__PURE__ */ new Map();
    this.cache = cache;
    this.dedupe = options.dedupe ?? true;
    this.dedupeInterval = options.dedupeInterval ?? 2e3;
    this.onError = options.onError;
    this.onSuccess = options.onSuccess;
  }
  shouldDedupe(key) {
    if (!this.dedupe) return false;
    const last = this.lastFetch.get(key);
    if (!last) return false;
    return Date.now() - last < this.dedupeInterval;
  }
  async get(key, fetcher) {
    const cached = await this.cache.getWithStatus(key);
    if (cached && !cached.isStale) {
      return cached.data;
    }
    const inflight = this.inflight.get(key);
    if (inflight) {
      if (cached) return cached.data;
      return inflight;
    }
    if (this.shouldDedupe(key)) {
      const stale = await this.cache.getStale(key);
      if (stale !== void 0) return stale;
    }
    const fetchPromise = this.fetch(key, fetcher, !!cached);
    if (cached) {
      fetchPromise.catch(() => {
      });
      return cached.data;
    }
    return fetchPromise;
  }
  async fetch(key, fetcher, isRevalidation) {
    this.lastFetch.set(key, Date.now());
    const promise = fetcher();
    this.inflight.set(key, promise);
    try {
      const data = await promise;
      await this.cache.set(key, data);
      this.onSuccess?.(data, key, isRevalidation);
      return data;
    } catch (error) {
      this.onError?.(error, key);
      throw error;
    } finally {
      this.inflight.delete(key);
    }
  }
  async revalidate(key, fetcher) {
    return this.fetch(key, fetcher, true);
  }
  async mutate(key, data) {
    await this.cache.set(key, data);
  }
  isValidating(key) {
    return this.inflight.has(key);
  }
};
function createSWR(cache, options) {
  const defaultCache = new MemoryCache(CACHE_PRESETS.STATIC);
  return new SWRCache(cache ?? defaultCache, options);
}
function createPersistentSWR(cache, options) {
  return new SWRCache(cache, options);
}
function createPokeAPIFetcher(baseUrl, cache, options) {
  const swr = createSWR(cache, options);
  return async (endpoint) => {
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
    const key = url;
    return swr.get(key, async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    });
  };
}

export { CACHE_PRESETS, MemoryCache, PersistentCache, SWRCache, createCache, createIndexedDBAdapter, createIndexedDBCache, createPersistentCache, createPersistentSWR, createPokeAPIFetcher, createSWR, localStorageAdapter, withCache };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map