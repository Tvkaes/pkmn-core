interface CacheEntry<T> {
    data: T;
    timestamp: number;
    stale?: boolean;
}
interface CacheOptions {
    maxAge?: number;
    maxSize?: number;
    staleAge?: number;
}
declare const CACHE_PRESETS: {
    readonly STATIC: {
        readonly maxAge: number;
        readonly staleAge: number;
    };
    readonly SEMI_STATIC: {
        readonly maxAge: number;
        readonly staleAge: number;
    };
    readonly SESSION: {
        readonly maxAge: number;
        readonly staleAge: number;
    };
};
interface CacheResult<T> {
    data: T;
    isStale: boolean;
}
declare class MemoryCache<T> {
    private cache;
    private readonly maxAge;
    private readonly staleAge;
    private readonly maxSize;
    constructor(options?: CacheOptions);
    private getEntryStatus;
    private evictOldest;
    get(key: string): T | undefined;
    getWithStatus(key: string): CacheResult<T> | undefined;
    getStale(key: string): T | undefined;
    set(key: string, data: T): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    keys(): string[];
}
declare function createCache<T>(options?: CacheOptions): MemoryCache<T>;
declare function withCache<T>(cache: MemoryCache<T>, keyFn: (args: unknown[]) => string, fetchFn: (...args: unknown[]) => Promise<T>): (...args: unknown[]) => Promise<T>;

export { CACHE_PRESETS, type CacheEntry, type CacheOptions, type CacheResult, MemoryCache, createCache, withCache };
