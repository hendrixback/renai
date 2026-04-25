"use client";

import { CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";

import {
  pickFuelFactor,
  type FuelFactorOption,
} from "@/lib/fuel-factor-preview";

const nf = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 4,
  minimumFractionDigits: 0,
});

/**
 * Inline factor card shown beneath the fuel-type / region selectors.
 * Matches the server-side preference order so the user sees the same
 * factor the action will use when they submit. Shows a warning when no
 * factor is found for the given combination.
 */
export function FuelFactorPreview({
  factors,
  fuelType,
  region,
  companyId,
}: {
  factors: FuelFactorOption[];
  fuelType: string;
  region: string;
  companyId: string;
}) {
  const pick = pickFuelFactor(factors, fuelType, region, companyId);

  if (!pick) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
        <AlertTriangleIcon className="size-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">No factor available</span>
          <span className="text-xs text-muted-foreground">
            We couldn&apos;t resolve an emission factor for{" "}
            <span className="font-mono">{fuelType}</span> · {region}. The entry
            will be saved without a kgCO₂e total — fix the missing factor in
            settings to recompute.
          </span>
        </div>
      </div>
    );
  }

  const isCompanyOverride = pick.companyId === companyId;
  const isRegional = !isCompanyOverride && pick.region === region;
  const flavour = isCompanyOverride
    ? "Company override"
    : isRegional
      ? "Regional default"
      : `Fallback (${pick.region ?? "any"})`;

  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <CheckCircle2Icon className="size-4 text-emerald-600 mt-0.5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">
          {pick.source} ({pick.year})
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {flavour}
          </span>
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {nf.format(pick.kgCo2ePerUnit)} kgCO₂e/{pick.unit}
          {pick.region ? ` · ${pick.region}` : null}
        </span>
      </div>
    </div>
  );
}
