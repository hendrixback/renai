"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusIcon } from "lucide-react";

import {
  registerProductionVolume,
  type SimpleState,
} from "@/app/(app)/carbon-footprint/production/actions";
import { COMMON_PRODUCTION_UNITS } from "@/lib/schemas/production.schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Site = { id: string; name: string };

const empty: SimpleState = { error: null, success: null, fieldErrors: {} };

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function RegisterProductionDialog({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<SimpleState>(empty);
  const [pending, start] = React.useTransition();

  const [productLabel, setProductLabel] = React.useState("");
  const [month, setMonth] = React.useState("");
  const [volume, setVolume] = React.useState("");
  const [unit, setUnit] = React.useState("ton");
  const [siteId, setSiteId] = React.useState("");
  const [notes, setNotes] = React.useState("");

  function reset() {
    setProductLabel("");
    setMonth("");
    setVolume("");
    setUnit("ton");
    setSiteId("");
    setNotes("");
    setState(empty);
  }

  function handleSave() {
    start(async () => {
      const result = await registerProductionVolume({
        productLabel,
        month,
        volume: Number(volume || "0"),
        unit,
        siteId: siteId || undefined,
        notes: notes || undefined,
      });
      setState(result);
      if (result.success) {
        router.refresh();
        setTimeout(() => {
          reset();
          setOpen(false);
        }, 400);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="size-4" />
            Record output
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record production volume</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="productLabel">Product / line</FieldLabel>
            <Input
              id="productLabel"
              value={productLabel}
              onChange={(e) => setProductLabel(e.target.value)}
              placeholder="e.g. Bottling line A"
            />
            <FieldError errors={state.fieldErrors.productLabel} />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
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
            <Field>
              <FieldLabel htmlFor="siteId">Plant / Site (optional)</FieldLabel>
              <select
                id="siteId"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className={selectClass}
              >
                <option value="">— Any —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="volume">Volume</FieldLabel>
              <Input
                id="volume"
                type="number"
                step="0.001"
                min={0}
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
              <FieldError errors={state.fieldErrors.volume} />
            </Field>
            <Field>
              <FieldLabel htmlFor="unit">Unit</FieldLabel>
              <Input
                id="unit"
                list="production-units"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="ton"
              />
              <datalist id="production-units">
                {COMMON_PRODUCTION_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
              <FieldError errors={state.fieldErrors.unit} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          {state.success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {state.success}
            </p>
          ) : null}
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </FieldGroup>

        <DialogFooter className="mt-6">
          <DialogClose
            render={
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            }
          />
          <Button onClick={handleSave} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Add"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
