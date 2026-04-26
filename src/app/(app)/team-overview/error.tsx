"use client";

import { RouteError } from "@/components/route-error";

export default function TeamOverviewError({
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
      title="Couldn't load team overview"
      description="We hit an error fetching your team. Try again — no member data has been touched."
    />
  );
}
