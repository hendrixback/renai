import "server-only";

/**
 * MVP in-memory rate limiter.
 *
 * Token bucket per (key, limiter) tuple, stored in a module-scope Map.
 * Survives for the lifetime of a single Node process.
 *
 * ### Known MVP limitations
 *
 * This implementation is deliberately simple for MVP footprint (one
 * Railway replica, one process):
 *
 *  - **Not distributed.** Two replicas → two independent buckets →
 *    2× the effective limit. When we scale past one replica we
 *    switch to @upstash/ratelimit per ADR-016 without changing the
 *    public API here.
 *  - **Lost on restart.** A deploy or crash resets all counts. Fine
 *    against organic burstiness, not against a persistent attacker
 *    coordinated around our deploy cadence. Log events via `logger`
 *    should make any abuse visible.
 *  - **Memory grows unboundedly** if an attacker cycles keys. A
 *    background sweep prunes expired buckets every 60s to cap that.
 *
 * The public API is stable — swapping the internals for Upstash
 * requires zero changes at call sites.
 */

type Bucket = {
  /** When the window first opened (ms since epoch). */
  windowStart: number;
  /** Tokens consumed in the current window. */
  count: number;
};

type LimiterConfig = {
  /** Human-readable id used in log + error output. */
  name: string;
  /** Max number of events allowed per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
};

export type LimiterResult = {
  allowed: boolean;
  /** Tokens remaining in the current window. Floored at 0. */
  remaining: number;
  /** ms until the window resets. */
  retryAfterMs: number;
  /** Timestamp (ms) at which the current window ends. */
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Prune expired buckets periodically so long-running processes don't
// accumulate dead keys. 60s is a compromise between memory pressure and
// wake-up overhead. `unref` so the timer doesn't keep the event loop alive.
const PRUNE_INTERVAL_MS = 60_000;
const MAX_BUCKET_AGE_MS = 60 * 60 * 1000; // 1h
if (typeof setInterval === "function") {
  const handle = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > MAX_BUCKET_AGE_MS) {
        buckets.delete(key);
      }
    }
  }, PRUNE_INTERVAL_MS);
  // Node allows unref; in other runtimes this might be a no-op.
  (handle as { unref?: () => void }).unref?.();
}

function bucketKey(limiterName: string, subject: string): string {
  return `${limiterName}::${subject}`;
}

export function checkLimit(
  config: LimiterConfig,
  subject: string,
): LimiterResult {
  const key = bucketKey(config.name, subject);
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= config.windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return {
      allowed: true,
      remaining: config.limit - 1,
      retryAfterMs: config.windowMs,
      resetAt: now + config.windowMs,
    };
  }

  if (existing.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: config.windowMs - (now - existing.windowStart),
      resetAt: existing.windowStart + config.windowMs,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: config.limit - existing.count,
    retryAfterMs: config.windowMs - (now - existing.windowStart),
    resetAt: existing.windowStart + config.windowMs,
  };
}

/** Wipe all buckets — test-only helper. */
export function __resetForTests(): void {
  buckets.clear();
}

/**
 * Preconfigured limiters. Pick from these at call sites; don't
 * instantiate ad-hoc configs so the "how many hits allowed" table
 * is reviewable in one place.
 */
export const limiters = Object.freeze({
  /** Login attempts. 5 per IP per 15 min. */
  login: {
    name: "login",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  } satisfies LimiterConfig,

  /** Password changes. 5 per user per hour. */
  passwordChange: {
    name: "password_change",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  } satisfies LimiterConfig,

  /** Signup (invitation acceptance). 10 per IP per hour. */
  signup: {
    name: "signup",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  } satisfies LimiterConfig,
});
