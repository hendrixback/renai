import * as Sentry from "@sentry/nextjs";

/**
 * Sentry init for the Node.js runtime (App Router / Route Handlers /
 * Server Actions). Only runs when `SENTRY_DSN` is set — `instrumentation.ts`
 * skips the dynamic import otherwise, so this file is also a safe no-op
 * for any code path that imports it directly.
 *
 * Sample rates are deliberately conservative in production; lift via env
 * once we have a baseline error volume to size against.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,

    // 10% in prod, 100% locally — overrideable via SENTRY_TRACES_SAMPLE_RATE.
    tracesSampleRate: parseRate(
      process.env.SENTRY_TRACES_SAMPLE_RATE,
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    ),

    // Don't ship PII or request bodies by default.
    sendDefaultPii: false,
  });
}

function parseRate(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}
