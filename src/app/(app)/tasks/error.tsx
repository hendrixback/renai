"use client";

import { RouteError } from "@/components/route-error";

export default function TasksError({
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
      title="Couldn't load tasks"
      description="We hit an error fetching tasks. Try again — assignments and statuses haven't changed."
    />
  );
}
