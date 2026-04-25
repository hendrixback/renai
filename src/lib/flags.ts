/**
 * Feature flags (ADR-010).
 *
 * One purpose only: gate **work-in-progress** modules so we can merge
 * code to main without exposing them to users. Once a feature ships
 * and the flag is flipped on in prod, **delete the flag** (and any
 * `if (flags.X)` guards) — don't leave dead conditionals around code
 * that always runs.
 *
 * For per-tenant rollout, A/B tests, or runtime kill-switches without
 * a redeploy, env-var flags are the wrong tool. The upgrade path is a
 * `FeatureOverride` table layered on top of the env defaults — add it
 * when the need is real.
 *
 * Naming convention: `{feature}Enabled`, boolean. Read from
 * `NEXT_PUBLIC_FLAG_{FEATURE}`. NEXT_PUBLIC_ prefix is deliberate so
 * the same import works in client components (sidebar gating) and
 * server components (route-level notFound()) without divergence.
 *
 * Usage:
 *   import { flags } from "@/lib/flags";
 *   if (!flags.regulationsEnabled) notFound();
 */

function read(envKey: string): boolean {
  const value = process.env[envKey];
  return value === "true" || value === "1";
}

export const flags = Object.freeze({
  /** Spec §16 — Regulations module (curated regulatory information hub). */
  regulationsEnabled: read("NEXT_PUBLIC_FLAG_REGULATIONS"),
});

export type FeatureFlagKey = keyof typeof flags;
