/**
 * Simple in-memory TTL cache.
 *
 * Used for hot-path lookups that don't change frequently:
 * sessions, credentials, course metadata.
 *
 * Single-instance only. If running multiple instances behind a
 * load balancer, swap this for Azure Cache for Redis.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTtlMs: number;

  constructor(opts: { maxSize?: number; defaultTtlSeconds: number }) {
    this.maxSize = opts.maxSize ?? 10_000;
    this.defaultTtlMs = opts.defaultTtlSeconds * 1000;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    // Evict oldest entries if at capacity
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  /** Remove all expired entries */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// ── Pre-configured caches ────────────────────────────────────────

/** Session cache: avoids hitting Azure Tables on every request. 60s TTL. */
export const sessionCache = new TTLCache<{ userId: string; userName: string; email: string; role: string; facility: string; expiresAt: string }>({
  defaultTtlSeconds: 60,
  maxSize: 20_000, // 16K users + headroom
});

/** Course metadata cache: courses rarely change. 5 min TTL. */
export const courseCache = new TTLCache<Record<string, unknown>>({
  defaultTtlSeconds: 300,
  maxSize: 500,
});

/** xAPI credential cache: avoids bcrypt on every statement. 60s TTL. */
export const credentialCache = new TTLCache<{ credential: Record<string, unknown>; secretHash: string }>({
  defaultTtlSeconds: 60,
  maxSize: 100,
});

// Prune all caches every 2 minutes
setInterval(() => {
  sessionCache.prune();
  courseCache.prune();
  credentialCache.prune();
}, 2 * 60 * 1000).unref();
