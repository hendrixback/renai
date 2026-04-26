"use client";

import { RouteError } from "@/components/route-error";

export default function SettingsError({
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
      title="Couldn't load settings"
      description="We hit an error opening your settings. Try again — nothing has been changed."
    />
  );
}
