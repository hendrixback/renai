// Client-safe helper that mirrors the server-side `findEmissionFactor`
// preference order. Used by RegisterFuelDialog + EditFuelEntryForm to
// show the user *which* factor will be applied before they submit
// (Spec §10 P3.3.5: emission-factor metadata visible, not hidden).

export type FuelFactorOption = {
  id: string;
  subtype: string;
  unit: string;
  kgCo2ePerUnit: number;
  source: string;
  region: string | null;
  year: number;
  companyId: string | null;
};

/**
 * Preference order: company-specific → region-specific → GLOBAL → any.
 * Mirrors `findEmissionFactor` in src/lib/carbon.ts so the form preview
 * matches what the server picks at write time.
 */
export function pickFuelFactor(
  factors: FuelFactorOption[],
  fuelType: string,
  region: string,
  companyId: string,
): FuelFactorOption | null {
  const matchSubtype = factors.filter((f) => f.subtype === fuelType);
  if (matchSubtype.length === 0) return null;

  const own = matchSubtype.find((f) => f.companyId === companyId);
  if (own) return own;

  const regional = matchSubtype
    .filter((f) => f.companyId === null && f.region === region)
    .sort((a, b) => b.year - a.year)[0];
  if (regional) return regional;

  const fallback = matchSubtype
    .filter((f) => f.companyId === null && f.region === "GLOBAL")
    .sort((a, b) => b.year - a.year)[0];
  if (fallback) return fallback;

  return matchSubtype.sort((a, b) => b.year - a.year)[0] ?? null;
}
