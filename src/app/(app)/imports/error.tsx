"use client";

import { RouteError } from "@/components/route-error";

export default function ImportsError({
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
      title="Couldn't load imports"
      description="We hit an error loading the imports workspace. Your previous imports are unaffected."
    />
  );
}
