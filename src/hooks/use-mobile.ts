import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Subscribe + getSnapshot pattern via useSyncExternalStore is the
// React-canonical way to track a media query without the
// "setState-in-effect" hazard the old useState/useEffect form runs
// into (cascading renders, mismatched first paint).
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot(): boolean {
  // SSR has no window — assume desktop. Hydration corrects on first paint.
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
