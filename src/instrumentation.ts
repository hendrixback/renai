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

import { captureRequestError } from "@sentry/nextjs";
import type { Instrumentation } from "next";

/**
 * Forward server-side request errors to Sentry **and** Railway stdout.
 *
 * Next 16 calls `onRequestError` for every uncaught Server Component /
 * Route Handler / Server Action error. Sentry's `captureRequestError`
 * does the right thing when DSN is set (and is a safe no-op when
 * unset). The structured-log emission to stdout is a belt-and-braces
 * second sink so prod errors are never invisible — even before the
 * Sentry env vars are wired in Railway.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  // Stdout — the only sink that's guaranteed to be queryable from
  // Railway's log dashboard regardless of observability config.
  const err = error as { message?: string; stack?: string; digest?: string };
  console.error(
    "[onRequestError]",
    JSON.stringify({
      message: err.message ?? String(error),
      digest: err.digest,
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      stack: err.stack?.split("\n").slice(0, 8).join("\n"),
    }),
  );

  // Sentry (no-op when DSN unset).
  return captureRequestError(error, request, context);
};
