"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Loader2, Trash2Icon } from "lucide-react";

import { deleteProductionVolume } from "@/app/(app)/carbon-footprint/production/actions";
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

export function DeleteProductionVolumeButton({
  id,
  productLabel,
}: {
  id: string;
  productLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
          />
        }
      >
        <Trash2Icon className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete production volume</DialogTitle>
          <DialogDescription>
            Permanently remove the{" "}
            <span className="font-medium text-foreground">{productLabel}</span>{" "}
            row? PEF for the relevant period will recompute on the next read.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              start(async () => {
                await deleteProductionVolume(id);
                setOpen(false);
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
