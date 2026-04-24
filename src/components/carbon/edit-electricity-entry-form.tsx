"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import {
  updateElectricityEntry,
  type SimpleState,
} from "@/app/(app)/carbon-footprint/actions";
import { REGIONS } from "@/lib/carbon-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Site = { id: string; name: string };

export type ElectricityEntryInitial = {
  id: string;
  kwh: string;
  month: string; // YYYY-MM
  renewablePercent: string | null;
  energyProvider: string | null;
  region: string;
  siteId: string | null;
  locationName: string | null;
  notes: string | null;
};

const emptyState: SimpleState = { error: null, success: null, fieldErrors: {} };

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function EditElectricityEntryForm({
  entry,
  sites,
}: {
  entry: ElectricityEntryInitial;
  sites: Site[];
}) {
  const router = useRouter();
  const [state, setState] = useState<SimpleState>(emptyState);
  const [pending, startTransition] = useTransition();

  const [kwh, setKwh] = useState(entry.kwh);
  const [month, setMonth] = useState(entry.month);
  const [renewablePercent, setRenewablePercent] = useState(
    entry.renewablePercent ?? "",
  );
  const [energyProvider, setEnergyProvider] = useState(
    entry.energyProvider ?? "",
  );
  const [region, setRegion] = useState(entry.region);
  const [siteId, setSiteId] = useState(entry.siteId ?? "");
  const [locationName, setLocationName] = useState(entry.locationName ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");

  function handleSubmit() {
    startTransition(async () => {
      const result = await updateElectricityEntry(entry.id, {
        kwh,
        month,
        renewablePercent,
        energyProvider,
        region,
        siteId,
        locationName,
        notes,
      });
      setState(result);
      if (result.success) {
        setTimeout(() => {
          router.push(`/carbon-footprint/electricity/${entry.id}`);
          router.refresh();
        }, 400);
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Scope 2 entry</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="kwh">kWh</FieldLabel>
              <Input
                id="kwh"
                type="number"
                step="0.001"
                min="0"
                value={kwh}
                onChange={(e) => setKwh(e.target.value)}
              />
              <FieldError errors={state.fieldErrors.kwh} />
            </Field>
            <Field>
              <FieldLabel htmlFor="month">Month</FieldLabel>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <FieldError errors={state.fieldErrors.month} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="renewablePercent">Renewable %</FieldLabel>
              <Input
                id="renewablePercent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0"
                value={renewablePercent}
                onChange={(e) => setRenewablePercent(e.target.value)}
              />
              <FieldError errors={state.fieldErrors.renewablePercent} />
            </Field>
            <Field>
              <FieldLabel htmlFor="energyProvider">Energy Provider</FieldLabel>
              <Input
                id="energyProvider"
                placeholder="e.g. EDP"
                value={energyProvider}
                onChange={(e) => setEnergyProvider(e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="region">Grid Region</FieldLabel>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={selectClass}
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="siteId">Plant / Location</FieldLabel>
              {sites.length > 0 ? (
                <select
                  id="siteId"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">— None —</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="locationName"
                  placeholder="Plant..."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              )}
              <FieldError errors={state.fieldErrors.siteId} />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          {state.success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {state.success}
            </p>
          ) : null}
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </FieldGroup>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={pending}
            render={
              <Link href={`/carbon-footprint/electricity/${entry.id}`}>
                Cancel
              </Link>
            }
          />
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
