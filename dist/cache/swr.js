// src/cache/memory.ts
var CACHE_PRESETS = {
  // For truly static data (pokemon stats, types, etc)
  STATIC: { maxAge: 1e3 * 60 * 60 * 24 * 7, staleAge: 1e3 * 60 * 60 * 24 * 30 }};
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

export { SWRCache, createPersistentSWR, createPokeAPIFetcher, createSWR };
//# sourceMappingURL=swr.js.map
//# sourceMappingURL=swr.js.map