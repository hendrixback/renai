"use client"

import { useRouter } from "next/navigation"
import * as React from "react"
import { ArchiveIcon, Loader2 } from "lucide-react"

import { archiveWasteFlow } from "@/app/(app)/waste-flows/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function WasteFlowArchiveButton({
  id,
  name,
}: {
  id: string
  name: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const onConfirm = () => {
    startTransition(async () => {
      await archiveWasteFlow(id)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ArchiveIcon className="size-4" />
            Archive
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive waste flow?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{name}</span> will
            be hidden from the default list but all its history, documents,
            and associated carbon entries stay intact. You can restore it
            later by editing the status.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            }
          />
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Archiving…
              </>
            ) : (
              "Archive"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
