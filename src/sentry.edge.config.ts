import * as Sentry from "@sentry/nextjs";

/**
 * Sentry init for the Edge runtime (middleware + edge route handlers).
 * Same DSN-gated no-op pattern as `sentry.server.config.ts`.
 *
 * The Edge SDK has a smaller integration set than Node — keep config
 * minimal and let any feature that doesn't exist on Edge fall through.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: parseRate(
      process.env.SENTRY_TRACES_SAMPLE_RATE,
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    ),
    sendDefaultPii: false,
  });
}

function parseRate(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}
