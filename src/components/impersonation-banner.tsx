"use client"

import { useTransition } from "react"
import { AlertTriangleIcon, Loader2 } from "lucide-react"

import { exitImpersonation } from "@/app/(app)/actions"
import { Button } from "@/components/ui/button"

export function ImpersonationBanner({ companyName }: { companyName: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <AlertTriangleIcon className="size-4" />
        <span>
          Viewing{" "}
          <span className="font-medium">{companyName}</span> as a platform
          admin. All actions run as this company.
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => exitImpersonation())}
      >
        {pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Exiting…
          </>
        ) : (
          "Exit admin view"
        )}
      </Button>
    </div>
  )
}
