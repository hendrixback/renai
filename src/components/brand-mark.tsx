import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Renai brand mark — minimal filled leaf silhouette with a subtle
 * central vein. Tilted slightly so it reads as organic rather than rigid.
 * Uses `currentColor` for the fill so callers control the brand shade.
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
      <g transform="rotate(-18 12 12)">
        {/* Leaf body */}
        <path
          d="M12 2.5C16.7 5 18.2 10.8 15.3 18.6C13.5 21 10.5 21 8.7 18.6C5.8 10.8 7.3 5 12 2.5Z"
          fill="currentColor"
        />
        {/* Central vein — a lighter overlay, works on the green fill */}
        <path
          d="M13.2 3.8L10.4 19.8"
          stroke="white"
          strokeOpacity="0.28"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
