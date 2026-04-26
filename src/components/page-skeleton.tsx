/**
 * Pre-baked skeleton compositions for the common Next App Router
 * `loading.tsx` shapes. Keep these dumb — no client state, no props
 * beyond layout knobs. They render before the real page resolves
 * server-side.
 *
 * If a route needs a bespoke skeleton (e.g. carbon-footprint with
 * tabs), write it inline in that route's loading.tsx instead of
 * extending these primitives.
 */

const PULSE = "animate-pulse rounded bg-muted";

export function ListPageSkeleton({
  rows = 8,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header line */}
      <div className={`${PULSE} h-4 w-72`} />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className={`${PULSE} h-9 w-64`} />
        <div className={`${PULSE} h-9 w-28`} />
        <div className={`${PULSE} h-9 w-28`} />
        <div className="flex-1" />
        <div className={`${PULSE} h-9 w-32`} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="bg-muted/30 grid gap-3 border-b p-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className={`${PULSE} h-3 w-20`} />
          ))}
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={r}
              className="grid gap-3 p-3"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, c) => (
                <div key={c} className={`${PULSE} h-4`} style={{ width: `${50 + ((r * 7 + c * 11) % 50)}%` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className={`${PULSE} h-4 w-72`} />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <div className={`${PULSE} mb-3 h-3 w-20`} />
            <div className={`${PULSE} h-7 w-28`} />
            <div className={`${PULSE} mt-2 h-3 w-16`} />
          </div>
        ))}
      </div>

      {/* Two-column lower row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <div className={`${PULSE} mb-4 h-4 w-40`} />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`${PULSE} h-8 w-8 rounded-full`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`${PULSE} h-3 w-3/4`} />
                  <div className={`${PULSE} h-2.5 w-1/3`} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className={`${PULSE} mb-4 h-4 w-40`} />
          <div className={`${PULSE} h-48 w-full rounded-lg`} />
        </div>
      </div>
    </div>
  );
}

export function FormPageSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className={`${PULSE} h-4 w-72`} />
      <div className="rounded-xl border bg-card p-6">
        <div className="space-y-5">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className={`${PULSE} h-3 w-32`} />
              <div className={`${PULSE} h-9 w-full max-w-md`} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <div className={`${PULSE} h-9 w-24`} />
          <div className={`${PULSE} h-9 w-24`} />
        </div>
      </div>
    </div>
  );
}
