"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2Icon, Loader2 } from "lucide-react";

import { commitImportSession } from "@/app/(app)/imports/actions";
import { Button } from "@/components/ui/button";

export function CommitImportButton({
  sessionId,
  count,
}: {
  sessionId: string;
  count: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        `Commit ${count} row${count === 1 ? "" : "s"}? Records will be created in the target module — this can't be undone via the UI (you'll have to delete each one).`,
      )
    ) {
      return;
    }
    setError(null);
    start(async () => {
      const result = await commitImportSession(sessionId);
      if (result.error) {
        setError(result.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleClick} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Committing…
          </>
        ) : (
          <>
            <CheckCircle2Icon className="size-4" />
            Commit {count} row{count === 1 ? "" : "s"}
          </>
        )}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
