"use client"

import { useTransition } from "react"
import { Trash2Icon } from "lucide-react"

import {
  deleteElectricityEntry,
  deleteFuelEntry,
} from "@/app/(app)/carbon-footprint/actions"
import { Button } from "@/components/ui/button"

export function DeleteFuelEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label="Delete"
      onClick={() => {
        if (window.confirm("Delete this fuel entry?")) {
          start(() => deleteFuelEntry(id))
        }
      }}
    >
      <Trash2Icon className="size-4" />
    </Button>
  )
}

export function DeleteElectricityEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label="Delete"
      onClick={() => {
        if (window.confirm("Delete this electricity entry?")) {
          start(() => deleteElectricityEntry(id))
        }
      }}
    >
      <Trash2Icon className="size-4" />
    </Button>
  )
}
