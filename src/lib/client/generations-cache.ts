type CacheKey = string;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const TTL_MS = 5 * 1000; // 5 seconds (short TTL for fast preview updates)
const MAX_CACHE_SIZE = 50; // Maximum number of cached entries

const cache = new Map<CacheKey, CacheEntry<any>>();
const inFlight = new Map<CacheKey, Promise<any>>();

export async function cachedJson<T>(key: CacheKey, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const p = (async () => {
    try {
      const v = await fetcher();
      
      // Limit cache size using LRU strategy
      if (cache.size >= MAX_CACHE_SIZE) {
        // Remove the oldest (first) entry
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }
      
      cache.set(key, { value: v, expiresAt: Date.now() + TTL_MS });
      return v;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, p);
  return p;
}

export function invalidateCached(keyPrefix: string) {
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(keyPrefix)) cache.delete(k);
  }
}
