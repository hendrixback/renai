"use client"

import * as React from "react"
import { useTransition } from "react"
import { EyeIcon, Loader2 } from "lucide-react"

import { adminViewAs } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

export function ViewAsButton({
  companyId,
  variant = "default",
  children,
}: {
  companyId: string
  variant?: "default" | "outline" | "ghost"
  children?: React.ReactNode
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => adminViewAs(companyId))}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Entering…
        </>
      ) : children ? (
        children
      ) : (
        <>
          <EyeIcon className="size-4" />
          View as this company
        </>
      )}
    </Button>
  )
}
