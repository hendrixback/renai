import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry init. Picked up automatically by Next 16 from
 * `src/instrumentation-client.ts`.
 *
 * The client DSN is `NEXT_PUBLIC_SENTRY_DSN` (must be public so it
 * inlines into the browser bundle). Init is skipped when unset, so
 * dev / CI / opt-out environments stay quiet.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    tracesSampleRate: parseRate(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    ),

    // Replays: off by default. Flip the on-error rate up once we have
    // a Sentry seat with replay quota.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    sendDefaultPii: false,
  });
}

function parseRate(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

/**
 * Required hook for Next 16's App Router navigation events to be
 * surfaced as Sentry breadcrumbs / transactions. Re-exported even when
 * the SDK is uninitialised because Next will invoke it anyway and the
 * SDK handles the no-op internally.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
