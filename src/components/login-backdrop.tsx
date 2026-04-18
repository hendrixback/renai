import * as React from "react"

/**
 * Login backdrop — organic morphing blobs in the brand green + dark tones.
 * Pure CSS (no JS, no external assets). The border-radius of each blob is
 * animated alongside its translation / scale / rotation to create a fluid,
 * lava-lamp-ish flow instead of a rigid translate-only drift.
 *
 * Respects `prefers-reduced-motion` via `motion-reduce:hidden` on the
 * animated layer — falls back to a static gradient.
 */

const BLOBS = [
  {
    className:
      "absolute left-[-15%] top-[-20%] size-[70vw] bg-primary/35 animate-morph-1 blur-3xl",
  },
  {
    className:
      "absolute right-[-10%] top-[-10%] size-[60vw] bg-emerald-700/25 animate-morph-2 blur-3xl",
  },
  {
    className:
      "absolute left-[10%] bottom-[-30%] size-[80vw] bg-teal-600/20 animate-morph-3 blur-3xl",
  },
  {
    className:
      "absolute right-[-5%] bottom-[-15%] size-[55vw] bg-primary/30 animate-morph-4 blur-3xl",
  },
  {
    className:
      "absolute left-[25%] top-[15%] size-[45vw] bg-neutral-950/40 dark:bg-neutral-950/70 animate-morph-5 blur-3xl",
  },
  {
    className:
      "absolute right-[30%] bottom-[25%] size-[35vw] bg-emerald-900/40 animate-morph-6 blur-3xl",
  },
]

export function LoginBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Animated morphing blobs (hidden for reduced-motion users) */}
      <div className="absolute inset-0 motion-reduce:hidden">
        {BLOBS.map((b, i) => (
          <div key={i} className={b.className} />
        ))}
      </div>

      {/* Static fallback for reduced-motion users */}
      <div
        className="absolute inset-0 hidden motion-reduce:block"
        style={{
          background:
            "radial-gradient(ellipse at top left, var(--primary) / 15%, transparent 55%), radial-gradient(ellipse at bottom right, var(--primary) / 10%, transparent 60%)",
          opacity: 0.6,
        }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.08] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      {/* Edge vignette so the card has a clean focus */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--background)_95%)]" />
    </div>
  )
}
