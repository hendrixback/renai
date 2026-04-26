"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Shared error-boundary UI for App Router `error.tsx` files. Captures
 * the error to Sentry on mount (in addition to whatever Next forwards
 * via `instrumentation.ts > onRequestError`, which only fires for
 * server errors — client-side renders that throw need explicit capture
 * to land in Sentry).
 */
export function RouteError({
  error,
  retry,
  title = "Something went wrong",
  description = "An unexpected error occurred while loading this section.",
  showDashboardLink = true,
}: {
  error: Error & { digest?: string };
  /** Next 16 passes this as `unstable_retry`. The wrapper rename keeps
   *  the shared component stable if/when the API stabilises. */
  retry: () => void;
  title?: string;
  description?: string;
  showDashboardLink?: boolean;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: "route" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
        {error.digest ? (
          <p className="text-muted-foreground/70 text-xs font-mono">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => retry()}
          className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium transition-colors"
        >
          Try again
        </button>
        {showDashboardLink ? (
          <Link
            href="/dashboard"
            className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center rounded-lg border px-4 text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        ) : null}
      </div>
    </div>
  );
}
