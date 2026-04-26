"use client";

import { RouteError } from "@/components/route-error";

export default function DocumentationError({
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
      title="Couldn't load documentation"
      description="We hit an error listing your documents. Files in storage are unaffected."
    />
  );
}
