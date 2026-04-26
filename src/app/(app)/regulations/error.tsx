"use client";

import { RouteError } from "@/components/route-error";

export default function RegulationsError({
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
      title="Couldn't load regulations"
      description="We hit an error fetching the regulation register. None of your records were modified."
    />
  );
}
