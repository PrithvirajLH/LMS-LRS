/**
 * In-memory sliding-window rate limiter.
 *
 * Each limiter tracks hits per key (IP, credential, etc.) using a Map
 * of timestamps. Expired entries are pruned on every check.
 *
 * Good enough for a single-instance deployment. If you scale to multiple
 * instances behind a load balancer, swap this for Azure Cache for Redis.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterOptions {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private maxRequests: number;
  private windowMs: number;

  constructor(opts: RateLimiterOptions) {
    this.maxRequests = opts.maxRequests;
    this.windowMs = opts.windowSeconds * 1000;
  }

  /**
   * Check if a request should be allowed.
   * Returns { allowed, remaining, retryAfterSeconds }.
   */
  check(key: string): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Prune expired timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= this.maxRequests) {
      // Calculate when the oldest request in the window will expire
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - entry.timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  /** Periodic cleanup of stale keys (call every few minutes) */
  prune(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

// ── Pre-configured limiters ─────────────────────────────────────────

/**
 * Auth endpoints: login, register — 20 attempts per 60s per IP.
 *
 * Higher limit than typical because healthcare orgs often have all
 * employees behind a single NAT/proxy IP. 20/min still blocks brute
 * force (password space >> 20) but allows a morning login rush from
 * the same building.
 */
export const authLimiter = new RateLimiter({
  maxRequests: parseInt(process.env.AUTH_RATE_LIMIT || "20", 10),
  windowSeconds: 60,
});

/** Password reset — 3 attempts per 60s per IP */
export const resetLimiter = new RateLimiter({
  maxRequests: parseInt(process.env.RESET_RATE_LIMIT || "3", 10),
  windowSeconds: 60,
});

/**
 * xAPI statement ingestion — per credential key.
 * Default: 300/min. Set XAPI_RATE_LIMIT env var to override
 * (e.g. "0" to disable for conformance testing).
 */
const xapiLimit = parseInt(process.env.XAPI_RATE_LIMIT || "300", 10);
export const xapiLimiter = new RateLimiter({
  maxRequests: xapiLimit || 999999, // 0 = effectively disabled
  windowSeconds: 60,
});

/** General API — 60 requests per 60s per IP */
export const generalLimiter = new RateLimiter({
  maxRequests: 60,
  windowSeconds: 60,
});

// Prune all limiters every 5 minutes to prevent memory leak
setInterval(() => {
  authLimiter.prune();
  resetLimiter.prune();
  xapiLimiter.prune();
  generalLimiter.prune();
}, 5 * 60 * 1000).unref();

// ── Helpers ─────────────────────────────────────────────────────────

/** Extract client IP from request (works behind proxies) */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  // X-Forwarded-For can contain a comma-separated list; first is the client
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  // Azure App Service / other proxies
  return (
    headers.get("x-real-ip") ||
    headers.get("x-client-ip") ||
    "unknown"
  );
}
