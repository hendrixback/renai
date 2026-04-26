"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";

import { deleteRegulation } from "@/app/(app)/regulations/actions";
import { Button } from "@/components/ui/button";

export function DeleteRegulationButton({
  id,
  redirectTo,
  label = "Delete",
}: {
  id: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        "Delete this regulation? It will be removed from the active register but kept in the audit trail.",
      )
    ) {
      return;
    }
    start(async () => {
      await deleteRegulation(id);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      <Trash2Icon className="mr-1.5 size-4" />
      {pending ? "Deleting…" : label}
    </Button>
  );
}
