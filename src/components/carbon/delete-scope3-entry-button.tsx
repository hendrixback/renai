"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Loader2, Trash2Icon } from "lucide-react";

import { deleteScope3Entry } from "@/app/(app)/carbon-footprint/value-chain/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteScope3EntryButton({
  id,
  description,
  redirectTo,
}: {
  id: string;
  description: string;
  /** Where to navigate after successful delete. Defaults to the list page. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            <Trash2Icon className="size-4" />
            Delete
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Scope 3 entry</DialogTitle>
          <DialogDescription>
            Permanently remove{" "}
            <span className="font-medium text-foreground">{description}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            }
          />
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              start(async () => {
                await deleteScope3Entry(id);
                setOpen(false);
                router.push(redirectTo ?? "/carbon-footprint/value-chain");
                router.refresh();
              });
            }}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
