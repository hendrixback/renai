// Filter contract for the Analysis module — Spec §14, Phase 4b.
// URL search params → typed filter object → where-clause helpers.
// Mirrors carbon-filters.ts patterns so that page server components,
// the client filter bar, and the export route stay symmetric.

const VALID_SCOPES = ["s1", "s2", "s3", "waste"] as const;

export type AnalysisScope = (typeof VALID_SCOPES)[number];

export const ANALYSIS_SCOPE_OPTIONS: ReadonlyArray<{
  value: AnalysisScope;
  label: string;
}> = [
  { value: "s1", label: "Scope 1" },
  { value: "s2", label: "Scope 2" },
  { value: "s3", label: "Scope 3" },
  { value: "waste", label: "Waste impact" },
];

export type AnalysisSearchParams = {
  year?: string | null;
  site?: string | null;
  scopes?: string | null;
  /** "1" enables prior-year overlay; anything else disables. */
  yoy?: string | null;
};

export type AnalysisFilters = {
  year: number;
  /** prior year, derived from `year`. Used when `yoy` is true. */
  priorYear: number;
  siteId?: string;
  scopes: ReadonlySet<AnalysisScope>;
  yoy: boolean;
};

function parseYear(raw: string | null | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 2000 && n <= 2100 ? n : undefined;
}

function parseScopes(raw: string | null | undefined): Set<AnalysisScope> {
  // Default = all scopes selected. Empty / invalid string keeps that
  // default rather than collapsing to an empty selection — an empty
  // selection would render an unhelpful blank page.
  if (!raw) return new Set(VALID_SCOPES);
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AnalysisScope =>
      (VALID_SCOPES as readonly string[]).includes(s),
    );
  if (parts.length === 0) return new Set(VALID_SCOPES);
  return new Set(parts);
}

export function parseAnalysisFilters(
  params: AnalysisSearchParams,
  now: Date = new Date(),
): AnalysisFilters {
  const year = parseYear(params.year) ?? now.getUTCFullYear();
  return {
    year,
    priorYear: year - 1,
    siteId: params.site ?? undefined,
    scopes: parseScopes(params.scopes),
    yoy: params.yoy === "1",
  };
}

export function describeAnalysisFilters(
  filters: AnalysisFilters,
  lookups: { sites: ReadonlyArray<{ id: string; name: string }> },
): string {
  const parts: string[] = [`Year: ${filters.year}`];
  if (filters.siteId) {
    const m = lookups.sites.find((s) => s.id === filters.siteId);
    parts.push(`Site: ${m?.name ?? filters.siteId}`);
  }
  const allOn = filters.scopes.size === ANALYSIS_SCOPE_OPTIONS.length;
  if (!allOn) {
    const labels = ANALYSIS_SCOPE_OPTIONS.filter((o) =>
      filters.scopes.has(o.value),
    )
      .map((o) => o.label)
      .join(", ");
    parts.push(`Scopes: ${labels || "none"}`);
  }
  if (filters.yoy) parts.push("YoY: on");
  return parts.join(" · ");
}

/** Years to offer in the analysis filter dropdown — current ± 4. */
export function analysisYearOptions(now: Date = new Date()): number[] {
  const y = now.getUTCFullYear();
  return [y, y - 1, y - 2, y - 3, y - 4];
}

export const ANALYSIS_VALID_SCOPES = VALID_SCOPES;
