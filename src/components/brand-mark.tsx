import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Renai brand mark — minimal leaf composed of a single quarter-moon curve
 * with a subtle inner stem. Designed to sit on any background at small
 * sizes (16–48px) without losing legibility.
 */
export function BrandMark({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("size-6", className)}
      {...props}
    >
      <path
        d="M4 20C4 11.163 11.163 4 20 4C20 12.837 12.837 20 4 20Z"
        fill="currentColor"
      />
      <path
        d="M6.5 17.5L17.5 6.5"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.25"
        strokeLinecap="round"
        style={{ mixBlendMode: "overlay" }}
      />
    </svg>
  )
}
