import { CacheResult } from './memory.js';
import { PersistentCache } from './storage.js';

interface SWROptions {
    dedupe?: boolean;
    dedupeInterval?: number;
    onError?: (error: unknown, key: string) => void;
    onSuccess?: (data: unknown, key: string, isRevalidation: boolean) => void;
}
type CacheInterface<T> = {
    get(key: string): T | undefined | Promise<T | undefined>;
    getWithStatus(key: string): CacheResult<T> | undefined | Promise<CacheResult<T> | undefined>;
    getStale(key: string): T | undefined | Promise<T | undefined>;
    set(key: string, data: T): void | Promise<void>;
};
declare class SWRCache<T> {
    private cache;
    private inflight;
    private lastFetch;
    private readonly dedupe;
    private readonly dedupeInterval;
    private readonly onError?;
    private readonly onSuccess?;
    constructor(cache: CacheInterface<T>, options?: SWROptions);
    private shouldDedupe;
    get(key: string, fetcher: () => Promise<T>): Promise<T>;
    private fetch;
    revalidate(key: string, fetcher: () => Promise<T>): Promise<T>;
    mutate(key: string, data: T): Promise<void>;
    isValidating(key: string): boolean;
}
declare function createSWR<T>(cache?: CacheInterface<T>, options?: SWROptions): SWRCache<T>;
declare function createPersistentSWR<T>(cache: PersistentCache<T>, options?: SWROptions): SWRCache<T>;
declare function createPokeAPIFetcher<T>(baseUrl: string, cache?: CacheInterface<T>, options?: SWROptions): (endpoint: string) => Promise<T>;

export { SWRCache, type SWROptions, createPersistentSWR, createPokeAPIFetcher, createSWR };
