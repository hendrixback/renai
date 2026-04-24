import "server-only";

/**
 * Feature flags (ADR-010).
 *
 * Env-based, per-deployment. No external service — simple and free, with
 * the upgrade path to per-tenant overrides (new `FeatureOverride` table)
 * when that becomes necessary.
 *
 * Usage:
 *   import { flags } from "@/lib/flags";
 *   if (!flags.scope3Enabled) notFound();
 *
 * Naming convention: `{feature}Enabled`, boolean. Read from
 * `NEXT_PUBLIC_FLAG_{FEATURE}` env var. NEXT_PUBLIC_ prefix is
 * deliberate — the same flag check runs on both client and server, so
 * avoiding a prefix mismatch is safer than forcing server-only checks.
 *
 * To stub a page behind a flag in a route:
 *
 *   import { flags } from "@/lib/flags";
 *   import { notFound } from "next/navigation";
 *
 *   export default function MyFlaggedPage() {
 *     if (!flags.scope3Enabled) notFound();
 *     ...
 *   }
 */

function read(envKey: string): boolean {
  const value = process.env[envKey];
  return value === "true" || value === "1";
}

export const flags = Object.freeze({
  /** Spec §12 — Scope 3 value-chain emissions. */
  scope3Enabled: read("NEXT_PUBLIC_FLAG_SCOPE3"),
  /** Spec §13 / Amendment A2 — Production intensity (PEF as a derived view). */
  productionIntensityEnabled: read("NEXT_PUBLIC_FLAG_PRODUCTION_INTENSITY"),
  /** Spec §14 — Analysis module (separate from Dashboard). */
  analysisEnabled: read("NEXT_PUBLIC_FLAG_ANALYSIS"),
  /** Spec §15 — Documentation module. Enabled by default, flag exists for emergency kill-switch. */
  documentationEnabled: !read("NEXT_PUBLIC_FLAG_DOCUMENTATION_DISABLED"),
  /** Spec §16 — Regulations. */
  regulationsEnabled: read("NEXT_PUBLIC_FLAG_REGULATIONS"),
  /** Spec §17 — Team Overview as a top-level module. */
  teamOverviewEnabled: read("NEXT_PUBLIC_FLAG_TEAM_OVERVIEW"),
  /** Spec §18 — Tasks + Activity Tracking. */
  tasksEnabled: read("NEXT_PUBLIC_FLAG_TASKS"),
  /** Spec §19 — AI assistant / insights. */
  aiAssistantEnabled: read("NEXT_PUBLIC_FLAG_AI_ASSISTANT"),
  /** Spec §20 — CSV/Excel import. */
  importExportEnabled: read("NEXT_PUBLIC_FLAG_IMPORT_EXPORT"),
});

export type FeatureFlagKey = keyof typeof flags;
