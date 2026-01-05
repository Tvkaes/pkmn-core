import { CacheOptions, CacheResult } from './memory.js';

interface StorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    keys(): Promise<string[]>;
    clear(): Promise<void>;
}
declare const localStorageAdapter: StorageAdapter;
declare function createIndexedDBAdapter(dbName: string, storeName: string): StorageAdapter;
interface PersistentCacheOptions extends CacheOptions {
    prefix?: string;
    storage?: StorageAdapter;
}
declare class PersistentCache<T> {
    private readonly prefix;
    private readonly storage;
    private readonly maxAge;
    private readonly staleAge;
    private readonly maxSize;
    private memoryCache;
    constructor(options?: PersistentCacheOptions);
    private getStorageKey;
    private getEntryStatus;
    get(key: string): Promise<T | undefined>;
    getWithStatus(key: string): Promise<CacheResult<T> | undefined>;
    getStale(key: string): Promise<T | undefined>;
    set(key: string, data: T): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    has(key: string): boolean;
    size(): number;
}
declare function createPersistentCache<T>(options?: PersistentCacheOptions): PersistentCache<T>;
declare function createIndexedDBCache<T>(dbName?: string, storeName?: string, options?: Omit<PersistentCacheOptions, 'storage'>): PersistentCache<T>;

export { PersistentCache, type PersistentCacheOptions, type StorageAdapter, createIndexedDBAdapter, createIndexedDBCache, createPersistentCache, localStorageAdapter };
