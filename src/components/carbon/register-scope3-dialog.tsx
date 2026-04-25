"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusIcon } from "lucide-react";

import {
  registerScope3Entry,
  type SimpleState,
} from "@/app/(app)/carbon-footprint/value-chain/actions";
import {
  BUSINESS_TRAVEL_MODES,
  SCOPE3_CATEGORIES,
  type BusinessTravelMode,
  type Scope3CategoryValue,
} from "@/lib/schemas/scope3.schema";
import { REGIONS } from "@/lib/carbon-options";
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

const CATEGORY_LABELS: Record<Scope3CategoryValue, string> = {
  PURCHASED_GOODS_SERVICES: "Purchased goods & services",
  FUEL_ENERGY_RELATED: "Fuel & energy-related (upstream)",
  UPSTREAM_TRANSPORT: "Upstream transport & distribution",
  WASTE_GENERATED: "Waste generated in operations",
  BUSINESS_TRAVEL: "Business travel",
  EMPLOYEE_COMMUTING: "Employee commuting",
  DOWNSTREAM_TRANSPORT: "Downstream transport & distribution",
};

const TRAVEL_MODE_LABELS: Record<BusinessTravelMode, string> = {
  air_short_haul: "Flight (short-haul, <3700km)",
  air_long_haul: "Flight (long-haul, >3700km)",
  air_domestic: "Flight (domestic)",
  rail_national: "Rail (national)",
  rail_international: "Rail (international / HSR)",
  taxi_regular: "Taxi",
  bus_coach: "Bus / coach",
  car_petrol_avg: "Car — petrol (per vehicle.km)",
  car_diesel_avg: "Car — diesel (per vehicle.km)",
  hotel_night: "Hotel (per night)",
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function RegisterScope3Dialog({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<SimpleState>(empty);
  const [pending, startTransition] = React.useTransition();

  const [category, setCategory] =
    React.useState<Scope3CategoryValue>("BUSINESS_TRAVEL");
  const [description, setDescription] = React.useState("");
  const [month, setMonth] = React.useState("");
  const [siteId, setSiteId] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // BUSINESS_TRAVEL fields
  const [travelMode, setTravelMode] =
    React.useState<BusinessTravelMode>("air_long_haul");
  const [distanceKm, setDistanceKm] = React.useState("");
  const [passengers, setPassengers] = React.useState("1");
  const [nights, setNights] = React.useState("");
  const [region, setRegion] = React.useState("GLOBAL");
  const [origin, setOrigin] = React.useState("");
  const [destination, setDestination] = React.useState("");

  // Generic fallback (other 6 categories)
  const [amount, setAmount] = React.useState("");
  const [amountUnit, setAmountUnit] = React.useState("");
  const [kgCo2eOverride, setKgCo2eOverride] = React.useState("");

  function reset() {
    setCategory("BUSINESS_TRAVEL");
    setDescription("");
    setMonth("");
    setSiteId("");
    setNotes("");
    setTravelMode("air_long_haul");
    setDistanceKm("");
    setPassengers("1");
    setNights("");
    setRegion("GLOBAL");
    setOrigin("");
    setDestination("");
    setAmount("");
    setAmountUnit("");
    setKgCo2eOverride("");
    setState(empty);
  }

  function buildPayload(): Record<string, unknown> {
    if (category === "BUSINESS_TRAVEL") {
      const data: Record<string, unknown> = {
        mode: travelMode,
        passengers: Number(passengers || "1"),
        region,
      };
      if (travelMode === "hotel_night") {
        if (nights) data.nights = Number(nights);
      } else {
        if (distanceKm) data.distanceKm = Number(distanceKm);
      }
      if (origin) data.origin = origin;
      if (destination) data.destination = destination;
      return {
        category,
        description,
        month,
        siteId: siteId || undefined,
        notes: notes || undefined,
        data,
      };
    }
    const data: Record<string, unknown> = {};
    if (amount) data.amount = Number(amount);
    if (amountUnit) data.unit = amountUnit;
    if (kgCo2eOverride) data.kgCo2eOverride = Number(kgCo2eOverride);
    return {
      category,
      description,
      month,
      siteId: siteId || undefined,
      notes: notes || undefined,
      data,
    };
  }

  function handleSave() {
    startTransition(async () => {
      const result = await registerScope3Entry(buildPayload());
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

  const isTravel = category === "BUSINESS_TRAVEL";
  const isHotel = isTravel && travelMode === "hotel_night";

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
            Register Scope 3
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Register Scope 3 entry</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <select
              id="category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as Scope3CategoryValue)
              }
              className={selectClass}
            >
              {SCOPE3_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors.category} />
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Q1 supplier deliveries Lisbon → Porto"
            />
            <FieldError errors={state.fieldErrors.description} />
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
                <option value="">— None —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {isTravel ? (
            <>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Travel details
                </p>
                <Field>
                  <FieldLabel htmlFor="travelMode">Mode</FieldLabel>
                  <select
                    id="travelMode"
                    value={travelMode}
                    onChange={(e) =>
                      setTravelMode(e.target.value as BusinessTravelMode)
                    }
                    className={selectClass}
                  >
                    {BUSINESS_TRAVEL_MODES.map((m) => (
                      <option key={m} value={m}>
                        {TRAVEL_MODE_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {isHotel ? (
                    <Field>
                      <FieldLabel htmlFor="nights">Nights</FieldLabel>
                      <Input
                        id="nights"
                        type="number"
                        min={1}
                        value={nights}
                        onChange={(e) => setNights(e.target.value)}
                      />
                      <FieldError errors={state.fieldErrors["data.nights"]} />
                    </Field>
                  ) : (
                    <>
                      <Field>
                        <FieldLabel htmlFor="distanceKm">Distance (km)</FieldLabel>
                        <Input
                          id="distanceKm"
                          type="number"
                          step="0.1"
                          min={0}
                          value={distanceKm}
                          onChange={(e) => setDistanceKm(e.target.value)}
                        />
                        <FieldError errors={state.fieldErrors["data.distanceKm"]} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="passengers">Passengers</FieldLabel>
                        <Input
                          id="passengers"
                          type="number"
                          min={1}
                          value={passengers}
                          onChange={(e) => setPassengers(e.target.value)}
                        />
                      </Field>
                    </>
                  )}
                  <Field>
                    <FieldLabel htmlFor="region">Region</FieldLabel>
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
                </div>

                {!isHotel ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="origin">Origin (optional)</FieldLabel>
                      <Input
                        id="origin"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="LIS"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="destination">Destination (optional)</FieldLabel>
                      <Input
                        id="destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="OPO"
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide">
                Quick entry (full form coming soon)
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="amount">Activity amount</FieldLabel>
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="amountUnit">Unit</FieldLabel>
                  <Input
                    id="amountUnit"
                    value={amountUnit}
                    onChange={(e) => setAmountUnit(e.target.value)}
                    placeholder="kg, EUR, km…"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="kgCo2eOverride">kgCO₂e (manual)</FieldLabel>
                  <Input
                    id="kgCo2eOverride"
                    type="number"
                    step="0.001"
                    min={0}
                    value={kgCo2eOverride}
                    onChange={(e) => setKgCo2eOverride(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

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
