"use client";

import { RouteError } from "@/components/route-error";

export default function WasteFlowsError({
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
      title="Couldn't load waste flows"
      description="We hit an error fetching your waste-flow records. Try again — your data hasn't been touched."
    />
  );
}
