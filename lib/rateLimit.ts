/**
 * Production-ready Rate Limiter with Upstash Redis support and In-Memory fallback.
 *
 * Defaults:
 * - upload: 10/min
 * - stylist: 5/min & 50/day
 * - share create: 10/min
 * - public share read: 60/min per IP
 * - credentials login & signup: 5/min per IP and email
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in ms
  retryAfter: number; // Seconds until reset
}

export interface RateLimiterStore {
  increment(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
}

// ── In-Memory Store ────────────────────────────────────────────────────────
interface MemoryEntry {
  count: number;
  resetAt: number;
}

class InMemoryStore implements RateLimiterStore {
  private map = new Map<string, MemoryEntry>();

  async increment(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.map.get(key);

    if (!entry || now >= entry.resetAt) {
      const resetAt = now + windowMs;
      this.map.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: max - 1,
        resetAt,
        retryAfter: Math.ceil(windowMs / 1000),
      };
    }

    if (entry.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter,
      };
    }

    entry.count += 1;
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      allowed: true,
      remaining: max - entry.count,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  reset(key: string) {
    this.map.delete(key);
  }
}

// ── Upstash Redis Store (REST API) ──────────────────────────────────────────
class UpstashRedisStore implements RateLimiterStore {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
  }

  async increment(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const windowSec = Math.ceil(windowMs / 1000);
    const now = Date.now();

    try {
      // Atomic pipeline: INCR and EXPIRE if new
      const pipelineUrl = `${this.url}/pipeline`;
      const res = await fetch(pipelineUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["TTL", key],
        ]),
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Upstash pipeline error: ${res.status}`);
      }

      const data = await res.json();
      const count = Number(data[0]?.result ?? 1);
      let ttl = Number(data[1]?.result ?? -1);

      if (ttl === -1) {
        // Set expiry if key had no TTL
        await fetch(`${this.url}/expire/${encodeURIComponent(key)}/${windowSec}`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        ttl = windowSec;
      }

      const retryAfter = ttl > 0 ? ttl : windowSec;
      const resetAt = now + retryAfter * 1000;

      if (count > max) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, max - count),
        resetAt,
        retryAfter,
      };
    } catch (err) {
      console.error("[RateLimiter] Upstash Redis request failed, failing open:", err);
      // Fallback open on network error to prevent blocking legitimate users
      return {
        allowed: true,
        remaining: 1,
        resetAt: now + windowMs,
        retryAfter: windowSec,
      };
    }
  }
}

// ── Store Selection & Production Warning ────────────────────────────────────
let hasLoggedStoreWarning = false;

function resolveStore(): RateLimiterStore {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    return new UpstashRedisStore(upstashUrl, upstashToken);
  }

  if (process.env.NODE_ENV === "production" && !hasLoggedStoreWarning) {
    hasLoggedStoreWarning = true;
    console.warn(
      "[RateLimiter] WARNING: Running in production without a shared Upstash Redis store (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). In-memory fallback will not coordinate rate limits across multiple serverless instances."
    );
  }

  return new InMemoryStore();
}

const activeStore = resolveStore();

// ── Rate Limiter Class ──────────────────────────────────────────────────────
export class RateLimiter {
  constructor(
    private prefix: string,
    private windowMs: number,
    private max: number,
    private store: RateLimiterStore = activeStore
  ) {}

  async check(identifier: string): Promise<RateLimitResult> {
    const key = `rl:${this.prefix}:${identifier}`;
    return this.store.increment(key, this.windowMs, this.max);
  }
}

// ── Pre-configured Production Limiters ──────────────────────────────────────
export const LIMIT_CONSTANTS = {
  UPLOAD_WINDOW_MS: 60_000,
  UPLOAD_MAX: 10,

  STYLIST_MINUTE_WINDOW_MS: 60_000,
  STYLIST_MINUTE_MAX: 5,
  STYLIST_DAY_WINDOW_MS: 86_400_000,
  STYLIST_DAY_MAX: 50,

  SHARE_CREATE_WINDOW_MS: 60_000,
  SHARE_CREATE_MAX: 10,

  SHARE_READ_WINDOW_MS: 60_000,
  SHARE_READ_MAX: 60,

  AUTH_WINDOW_MS: 60_000,
  AUTH_MAX: 5,
} as const;

export const uploadLimiter = new RateLimiter(
  "upload",
  LIMIT_CONSTANTS.UPLOAD_WINDOW_MS,
  LIMIT_CONSTANTS.UPLOAD_MAX
);

export const stylistMinuteLimiter = new RateLimiter(
  "stylist:min",
  LIMIT_CONSTANTS.STYLIST_MINUTE_WINDOW_MS,
  LIMIT_CONSTANTS.STYLIST_MINUTE_MAX
);

export const stylistDayLimiter = new RateLimiter(
  "stylist:day",
  LIMIT_CONSTANTS.STYLIST_DAY_WINDOW_MS,
  LIMIT_CONSTANTS.STYLIST_DAY_MAX
);

export const shareCreateLimiter = new RateLimiter(
  "share:create",
  LIMIT_CONSTANTS.SHARE_CREATE_WINDOW_MS,
  LIMIT_CONSTANTS.SHARE_CREATE_MAX
);

export const shareReadLimiter = new RateLimiter(
  "share:read",
  LIMIT_CONSTANTS.SHARE_READ_WINDOW_MS,
  LIMIT_CONSTANTS.SHARE_READ_MAX
);

export const authLimiter = new RateLimiter(
  "auth",
  LIMIT_CONSTANTS.AUTH_WINDOW_MS,
  LIMIT_CONSTANTS.AUTH_MAX
);

export const healthLimiter = new RateLimiter(
  "health",
  60_000,
  60
);

export const accountDeleteLimiter = new RateLimiter(
  "account:delete",
  60_000,
  5
);

// ── Helpers ─────────────────────────────────────────────────────────────────
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}
