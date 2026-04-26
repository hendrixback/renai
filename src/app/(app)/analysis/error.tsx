"use client";

import { RouteError } from "@/components/route-error";

export default function AnalysisError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={unstable_retry}
      title="Couldn't load analysis"
      description="We hit an error aggregating sustainability data. Try again, or narrow your filters."
    />
  );
}
