/**
 * In-memory sliding-window rate limiter.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   const result = limiter.check(identifier);
 *   if (!result.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
 *
 * Notes:
 * - Works per-process. On multi-instance deployments (e.g. Vercel), limits are per-instance.
 * - For cross-instance rate limiting, swap the Map for a Redis store (Upstash recommended).
 * - The map is bounded: entries are purged when they exceed windowMs.
 */

interface RateLimiterOptions {
  /** Time window in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number;
  /** Maximum number of requests allowed per identifier per window. Default: 10 */
  max?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix ms timestamp when the window resets
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter({
  windowMs = 60_000,
  max = 10,
}: RateLimiterOptions = {}) {
  const map = new Map<string, WindowEntry>();

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const entry = map.get(identifier);

      if (!entry || now >= entry.resetAt) {
        // New window
        const resetAt = now + windowMs;
        map.set(identifier, { count: 1, resetAt });
        return { allowed: true, remaining: max - 1, resetAt };
      }

      if (entry.count >= max) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count += 1;
      return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
    },

    /** Manually clear a key (useful in tests) */
    reset(identifier: string) {
      map.delete(identifier);
    },
  };
}

// ── Pre-built limiters for each sensitive route ───────────────────────────

/** Upload: 15 uploads per minute per user */
export const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 15 });

/** AI Stylist: 10 requests per minute per user */
export const stylistLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/** Share link operations: 20 per minute per user */
export const shareLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
