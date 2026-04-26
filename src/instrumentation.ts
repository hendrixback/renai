/**
 * Next.js instrumentation entry point.
 *
 * Called once at server startup before the first request is served.
 * Used to wire Sentry, OpenTelemetry, etc.
 *
 * The Sentry init is split per runtime (`nodejs`, `edge`) because the
 * SDK ships separate code paths for each. We import them dynamically
 * so the wrong one never ends up in the wrong bundle.
 *
 * Both server-side initialisations are guarded by `SENTRY_DSN`. When
 * the env is unset (local dev, CI, or any tenant env that opts out)
 * the Sentry SDK is loaded but `Sentry.init` is skipped — every Sentry
 * call becomes a cheap no-op rather than throwing.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Forward server-side request errors to Sentry. Next 16 calls this for
 * every uncaught Server Component / Route Handler / Server Action
 * error. Re-exported from `@sentry/nextjs` so the SDK's own context
 * enrichment runs unchanged.
 */
export { captureRequestError as onRequestError } from "@sentry/nextjs";
