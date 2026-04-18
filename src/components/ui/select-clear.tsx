"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Small × button that sits *inside* a Select trigger, to the left of the
 * chevron. Absolutely positioned as a sibling to the trigger (not nested
 * inside the <button>, to stay valid HTML) — the parent wrapper handles
 * relative positioning.
 *
 * `onPointerDown` stops propagation so base-ui's trigger doesn't open the
 * popup when the user clicks the clear button.
 */
export function SelectClearButton({
  visible,
  onClear,
  label,
  className,
}: {
  visible: boolean
  onClear: () => void
  label: string
  className?: string
}) {
  if (!visible) return null
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClear()
      }}
      className={cn(
        "absolute top-1/2 right-7 z-10 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <XIcon className="size-3.5" />
    </button>
  )
}
