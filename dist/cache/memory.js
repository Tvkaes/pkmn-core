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

export { CACHE_PRESETS, MemoryCache, createCache, withCache };
//# sourceMappingURL=memory.js.map
//# sourceMappingURL=memory.js.map