/**
 * Insights engine (Spec §19.6).
 *
 * Pure rules-based — no LLM. Each generator inspects the company's
 * data and emits 0..N `Insight` records that the dashboard surfaces.
 * The categorisation + severity scheme is shared so the UI can group
 * insights consistently regardless of which generator produced them.
 */

export type InsightSeverity = "info" | "warning" | "critical";

export type InsightCategory =
  | "data-quality"      // missing fields, missing classifications
  | "compliance"         // hazardous-without-treatment, missing audit evidence
  | "emissions"          // dominance, anomalies, sudden changes
  | "operations";        // sites without data, abandoned flows

export type Insight = {
  /** Stable identifier for dedup + future "dismiss" / "snooze" UX. */
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  /** Short headline, one line. */
  title: string;
  /** One-sentence detail. Plain text, no markup — the UI renders it
   *  as-is. Numeric values should be pre-formatted. */
  message: string;
  /** Optional deep-link to the most useful remediation page. */
  href?: string;
  ctaLabel?: string;
  /** Bag for downstream tooling — never displayed to the user. */
  metadata?: Record<string, unknown>;
};

export type InsightGeneratorContext = {
  companyId: string;
  /** Reporting year filter. Defaults to current year inside generators
   *  that need it. */
  year?: number;
  /** Optional site filter — when set, generators that scope by site
   *  should respect it. */
  siteId?: string;
};

export type InsightGenerator = (
  ctx: InsightGeneratorContext,
) => Promise<Insight[]>;

/** Deterministic order so the UI's "top issues first" stays stable
 *  between renders without requiring further sort keys. */
export const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function compareInsights(a: Insight, b: Insight): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  return a.id.localeCompare(b.id);
}
