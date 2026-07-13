import type { Context, MiddlewareHandler } from "hono";
import type { HonoEnv } from "../types";

type RateLimitOptions = {
  windowSeconds: number;
  max: number;
  message?: string;
};

type Counter = { count: number; resetAt: number };

interface RateLimiterStore {
  hit(key: string, windowSeconds: number): Promise<Counter>;
}

// In-memory store used when no KV namespace is bound (tests, fresh
// `wrangler dev`). Counters are process-scoped and reset on restart —
// fine for local dev and the test suite. Each middleware instance gets
// its own store so counters never leak between independent routes.
function createInMemoryStore(): RateLimiterStore {
  const counters = new Map<string, Counter>();
  return {
    async hit(key, windowSeconds) {
      const now = Math.floor(Date.now() / 1000);
      const existing = counters.get(key);
      if (!existing || existing.resetAt <= now) {
        const fresh: Counter = {
          count: 1,
          resetAt: now + windowSeconds,
        };
        counters.set(key, fresh);
        return fresh;
      }
      existing.count += 1;
      return existing;
    },
  };
}

// Production store backed by Cloudflare Workers KV. Each (key, window)
// maps to one KV entry storing `{ count, resetAt }` as JSON. The window
// is bucketed to a fixed start so all requests in the same window share
// the same KV key, avoiding race conditions on rollover.
function createKvStore(kv: KVNamespace): RateLimiterStore {
  return {
    async hit(key, windowSeconds) {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
      const resetAt = windowStart + windowSeconds;
      const kvKey = `${key}:${windowStart}`;

      const raw = await kv.get(kvKey);
      const current: Counter = raw
        ? (JSON.parse(raw) as Counter)
        : { count: 0, resetAt };

      current.count += 1;

      // TTL with a 60s buffer for clock skew between Worker and KV.
      await kv.put(kvKey, JSON.stringify(current), {
        expirationTtl: windowSeconds + 60,
      });

      return current;
    },
  };
}

// Decode the JWT payload without verifying — `requireUser` runs later
// and does the real verification. We only need the `sub` claim for
// keying here. Uses only Web-standard APIs so it works in Workers
// without nodejs_compat.
function decodeJwtSubject(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const bytes = new Uint8Array(json.length);
    for (let i = 0; i < json.length; i++) bytes[i] = json.charCodeAt(i);
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
      sub?: string;
    };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

// Extract the client IP from Cloudflare's header first, then standard
// forwarded headers. Falls back to "unknown" for direct app.request()
// calls in tests.
function getClientIp(c: Context): string {
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Real-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// Determine the rate-limit key for this request. Prefers the
// authenticated user (set by `requireUser`), then the JWT `sub` claim
// (when the limiter runs before `requireUser`), then the client IP.
function getIdentity(c: Context<HonoEnv>): string {
  const user = c.get("user");
  if (user) return `user:${user.id}`;

  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const sub = decodeJwtSubject(authHeader.slice(7));
    if (sub) return `user:${sub}`;
  }

  return `ip:${getClientIp(c)}`;
}

// Per-route rate-limit middleware. Mount it after `requireUser` on
// routes that need per-user limits, or before it for per-IP limits.
// Returns 429 with a Retry-After header once the limit is exceeded.
export function rateLimitMiddleware(
  options: RateLimitOptions
): MiddlewareHandler<HonoEnv> {
  // Fallback store is created once per middleware instance so each
  // mounted route gets its own counters — no leakage between tests.
  const fallbackStore = createInMemoryStore();

  return async (c, next) => {
    const store = c.env.RATE_LIMIT_KV
      ? createKvStore(c.env.RATE_LIMIT_KV)
      : fallbackStore;

    const identity = getIdentity(c);
    const key = `rl:${options.windowSeconds}:${identity}`;

    const { count, resetAt } = await store.hit(key, options.windowSeconds);
    const remaining = Math.max(0, options.max - count);
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = Math.max(1, resetAt - now);

    c.header("RateLimit-Limit", String(options.max));
    c.header("RateLimit-Remaining", String(remaining));
    c.header("RateLimit-Reset", String(retryAfter));

    if (count > options.max) {
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: options.message ?? "Rate limit exceeded" }, 429);
    }

    await next();
  };
}
