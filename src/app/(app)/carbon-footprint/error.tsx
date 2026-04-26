"use client";

import { RouteError } from "@/components/route-error";

export default function CarbonFootprintError({
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
      title="Couldn't load carbon footprint"
      description="We hit an error pulling emissions data. None of your records were modified."
    />
  );
}
