"use client";

import { RouteError } from "@/components/route-error";

export default function DashboardError({
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
      title="Couldn't load the dashboard"
      description="We hit an error pulling your sustainability snapshot. Try again, or jump to a specific module from the sidebar."
      showDashboardLink={false}
    />
  );
}
