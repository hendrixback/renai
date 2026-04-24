import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetForTests,
  checkLimit,
  limiters,
  type LimiterResult,
} from "./rate-limit";

const CONFIG = { name: "test", limit: 3, windowMs: 60_000 };

function allowedCount(results: LimiterResult[]): number {
  return results.filter((r) => r.allowed).length;
}

describe("rate-limit", () => {
  beforeEach(() => {
    __resetForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetForTests();
  });

  it("allows the first N hits and rejects the N+1th", () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(checkLimit(CONFIG, "ip-1"));
    }
    expect(allowedCount(results)).toBe(3);
    expect(results[0].allowed).toBe(true);
    expect(results[2].allowed).toBe(true);
    expect(results[3].allowed).toBe(false);
    expect(results[4].allowed).toBe(false);
  });

  it("scopes buckets per subject — different keys are independent", () => {
    for (let i = 0; i < 3; i++) checkLimit(CONFIG, "ip-1");
    // ip-1 is now at the cap; ip-2 should still get its own full allowance.
    const result = checkLimit(CONFIG, "ip-2");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("scopes buckets per limiter — same subject across limiters is independent", () => {
    const a = { name: "a", limit: 1, windowMs: 60_000 };
    const b = { name: "b", limit: 1, windowMs: 60_000 };
    expect(checkLimit(a, "user-1").allowed).toBe(true);
    // Same subject but a different limiter → fresh bucket.
    expect(checkLimit(b, "user-1").allowed).toBe(true);
    // Hitting `a` again should be blocked.
    expect(checkLimit(a, "user-1").allowed).toBe(false);
  });

  it("resets after the window elapses", () => {
    for (let i = 0; i < 3; i++) checkLimit(CONFIG, "ip-1");
    expect(checkLimit(CONFIG, "ip-1").allowed).toBe(false);

    // Advance past the window.
    vi.advanceTimersByTime(CONFIG.windowMs + 1);

    const after = checkLimit(CONFIG, "ip-1");
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(CONFIG.limit - 1);
  });

  it("reports remaining tokens and resetAt monotonically within a window", () => {
    const r1 = checkLimit(CONFIG, "ip-1");
    const r2 = checkLimit(CONFIG, "ip-1");
    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r1.resetAt).toBe(r2.resetAt);
    expect(r1.retryAfterMs).toBeLessThanOrEqual(CONFIG.windowMs);
  });

  it("exposes preconfigured limiters with expected shapes", () => {
    expect(limiters.login).toMatchObject({
      name: "login",
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    expect(limiters.passwordChange).toMatchObject({
      name: "password_change",
      limit: 5,
    });
    expect(limiters.signup).toMatchObject({
      name: "signup",
      limit: 10,
    });
  });
});
