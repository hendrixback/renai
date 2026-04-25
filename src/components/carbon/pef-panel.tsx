"use client";

import * as React from "react";
import { ScaleIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });
const intnf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

type Props = {
  year: number;
  /** kgCO₂e per scope for the year (already filtered by site if any). */
  byScope: { s1: number; s2: number; s3: number };
  /** Sum of production volume per unit for the year. */
  unitMix: Record<string, number>;
  /** When set, the calc has a single unit; PEF is well-defined. */
  primaryUnit: string | null;
  /** Optional pre-resolved PEF for the default mask, if SSR computed one. */
  initialPef?: number | null;
};

/**
 * Live PEF panel. Per Amendment A2 the user can dial scope inclusion
 * (S1 only / S1+S2 / S1+S2+S3 — and any combo). Math runs client-side
 * since it's pure arithmetic over already-fetched aggregates; no round-
 * trip needed when the toggle flips.
 */
export function PefPanel({ year, byScope, unitMix, primaryUnit }: Props) {
  const [s1, setS1] = React.useState(true);
  const [s2, setS2] = React.useState(true);
  const [s3, setS3] = React.useState(true);

  const numerator =
    (s1 ? byScope.s1 : 0) + (s2 ? byScope.s2 : 0) + (s3 ? byScope.s3 : 0);

  const denominator = primaryUnit ? unitMix[primaryUnit] ?? 0 : 0;
  const pef =
    primaryUnit && denominator > 0 ? numerator / denominator : null;

  const distinctUnits = Object.keys(unitMix);
  const multiUnit = distinctUnits.length > 1;
  const noVolume = distinctUnits.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScaleIcon className="size-4" />
            Production Emission Factor — {year}
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            kgCO₂e per unit produced. Scope inclusion drives the numerator;
            denominator sums all production volumes for the year.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScopeToggle id="s1" label="S1" checked={s1} onChange={setS1} />
          <ScopeToggle id="s2" label="S2" checked={s2} onChange={setS2} />
          <ScopeToggle id="s3" label="S3" checked={s3} onChange={setS3} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-muted-foreground text-xs">Numerator</p>
          <p className="text-2xl font-semibold tabular-nums">
            {intnf.format(numerator / 1000)}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              tCO₂e
            </span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            S1 {intnf.format(byScope.s1 / 1000)} t · S2{" "}
            {intnf.format(byScope.s2 / 1000)} t · S3{" "}
            {intnf.format(byScope.s3 / 1000)} t
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-muted-foreground text-xs">Denominator</p>
          {noVolume ? (
            <p className="text-base">
              <span className="text-muted-foreground">No volume recorded.</span>
            </p>
          ) : multiUnit ? (
            <>
              <p className="text-base font-medium">Mixed units</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {Object.entries(unitMix)
                  .map(([u, v]) => `${nf.format(v)} ${u}`)
                  .join(" · ")}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold tabular-nums">
                {nf.format(denominator)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  {primaryUnit}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Sum of volume rows for {year}.
              </p>
            </>
          )}
        </div>

        <div className="rounded-lg border bg-emerald-500/5 p-4 ring-1 ring-emerald-500/30">
          <p className="text-muted-foreground text-xs">PEF</p>
          {pef !== null ? (
            <>
              <p className="text-2xl font-semibold tabular-nums">
                {nf.format(pef)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  kgCO₂e/{primaryUnit}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Live — recomputes when emissions or volumes change.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {multiUnit
                ? "PEF unavailable while production rows use multiple units."
                : noVolume
                  ? "Record production volume to enable PEF."
                  : "Add scope coverage to enable PEF."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScopeToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Label
      htmlFor={id}
      className="flex items-center gap-1.5 rounded-md border bg-transparent px-2.5 py-1 text-xs"
    >
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      {label}
    </Label>
  );
}
