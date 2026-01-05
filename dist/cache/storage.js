// src/cache/memory.ts
var CACHE_PRESETS = {
  // For truly static data (pokemon stats, types, etc)
  STATIC: { maxAge: 1e3 * 60 * 60 * 24 * 7, staleAge: 1e3 * 60 * 60 * 24 * 30 }};

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

export { PersistentCache, createIndexedDBAdapter, createIndexedDBCache, createPersistentCache, localStorageAdapter };
//# sourceMappingURL=storage.js.map
//# sourceMappingURL=storage.js.map