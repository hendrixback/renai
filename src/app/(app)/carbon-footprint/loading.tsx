export default function CarbonFootprintLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Description line */}
      <div className="flex flex-col gap-1">
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {/* Tabs bar */}
      <div className="flex flex-wrap gap-1 rounded-xl border bg-muted/30 p-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-lg bg-muted"
            style={{ width: `${80 + ((i * 17) % 40)}px` }}
          />
        ))}
      </div>

      {/* Content area */}
      <div className="mt-2 space-y-4">
        {/* Summary cards row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="mb-3 h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-6 w-28 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
