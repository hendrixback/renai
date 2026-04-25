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
  EMPLOYEE_COMMUTING_MODES,
  FREIGHT_MODES,
  SCOPE3_CATEGORIES,
  type BusinessTravelMode,
  type EmployeeCommutingMode,
  type FreightMode,
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
type WasteFlow = { id: string; name: string };

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

const COMMUTING_MODE_LABELS: Record<EmployeeCommutingMode, string> = {
  car_petrol_avg: "Car — petrol",
  car_diesel_avg: "Car — diesel",
  bus_coach: "Bus / coach",
  rail_national: "Train (national)",
  metro_subway: "Metro / subway",
  bicycle: "Bicycle (zero emissions)",
  walk: "Walk (zero emissions)",
  scooter: "Motor scooter",
};

const FREIGHT_MODE_LABELS: Record<FreightMode, string> = {
  truck_avg: "Truck (HGV, average)",
  truck_articulated: "Truck (articulated, >17t)",
  van_light: "Light van",
  rail_freight: "Rail freight",
  ship_container: "Sea — container ship",
  air_freight_long_haul: "Air freight (long-haul)",
  inland_waterway: "Inland waterway / barge",
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function RegisterScope3Dialog({
  sites,
  wasteFlows = [],
}: {
  sites: Site[];
  wasteFlows?: WasteFlow[];
}) {
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

  // EMPLOYEE_COMMUTING fields
  const [commutingMode, setCommutingMode] =
    React.useState<EmployeeCommutingMode>("car_petrol_avg");
  const [distancePerDayKm, setDistancePerDayKm] = React.useState("");
  const [daysPerYear, setDaysPerYear] = React.useState("220");
  const [employees, setEmployees] = React.useState("1");

  // FREIGHT (UPSTREAM_TRANSPORT + DOWNSTREAM_TRANSPORT) fields
  const [freightMode, setFreightMode] = React.useState<FreightMode>("truck_avg");
  const [tonnes, setTonnes] = React.useState("");
  const [freightDistanceKm, setFreightDistanceKm] = React.useState("");
  const [freightOrigin, setFreightOrigin] = React.useState("");
  const [freightDestination, setFreightDestination] = React.useState("");

  // WASTE_GENERATED — references an existing WasteFlow
  const [wasteFlowId, setWasteFlowId] = React.useState("");

  // Generic fallback (remaining categories)
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
    setCommutingMode("car_petrol_avg");
    setDistancePerDayKm("");
    setDaysPerYear("220");
    setEmployees("1");
    setFreightMode("truck_avg");
    setTonnes("");
    setFreightDistanceKm("");
    setFreightOrigin("");
    setFreightDestination("");
    setWasteFlowId("");
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
    if (category === "EMPLOYEE_COMMUTING") {
      const data: Record<string, unknown> = {
        mode: commutingMode,
        distancePerDayKm: Number(distancePerDayKm || "0"),
        daysPerYear: Number(daysPerYear || "220"),
        employees: Number(employees || "1"),
        region,
      };
      return {
        category,
        description,
        month,
        siteId: siteId || undefined,
        notes: notes || undefined,
        data,
      };
    }
    if (
      category === "UPSTREAM_TRANSPORT" ||
      category === "DOWNSTREAM_TRANSPORT"
    ) {
      const data: Record<string, unknown> = {
        mode: freightMode,
        tonnes: Number(tonnes || "0"),
        distanceKm: Number(freightDistanceKm || "0"),
        region,
      };
      if (freightOrigin) data.origin = freightOrigin;
      if (freightDestination) data.destination = freightDestination;
      return {
        category,
        description,
        month,
        siteId: siteId || undefined,
        notes: notes || undefined,
        data,
      };
    }
    if (category === "WASTE_GENERATED") {
      const matched = wasteFlows.find((w) => w.id === wasteFlowId);
      const data: Record<string, unknown> = { wasteFlowId };
      if (matched) data.wasteFlowName = matched.name;
      return {
        category,
        description: description || matched?.name || "Waste flow emissions",
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
  const isCommuting = category === "EMPLOYEE_COMMUTING";
  const isFreight =
    category === "UPSTREAM_TRANSPORT" || category === "DOWNSTREAM_TRANSPORT";
  const isWasteRef = category === "WASTE_GENERATED";
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

          {isWasteRef ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Waste flow
              </p>
              {wasteFlows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No waste flows registered yet. Add a waste flow first, then
                  link it here.
                </p>
              ) : (
                <Field>
                  <FieldLabel htmlFor="wasteFlowId">Linked waste flow</FieldLabel>
                  <select
                    id="wasteFlowId"
                    value={wasteFlowId}
                    onChange={(e) => setWasteFlowId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">— Select —</option>
                    {wasteFlows.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <FieldError errors={state.fieldErrors["data.wasteFlowId"]} />
                </Field>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                Per Amendment A3, waste-related Scope 3 records reference an
                existing waste flow rather than duplicating data. The kgCO₂e
                is snapshotted from the flow&apos;s current treatment-pathway
                impact at save time.
              </p>
            </div>
          ) : isFreight ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Freight details
              </p>
              <Field>
                <FieldLabel htmlFor="freightMode">Mode</FieldLabel>
                <select
                  id="freightMode"
                  value={freightMode}
                  onChange={(e) => setFreightMode(e.target.value as FreightMode)}
                  className={selectClass}
                >
                  {FREIGHT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {FREIGHT_MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="tonnes">Tonnes</FieldLabel>
                  <Input
                    id="tonnes"
                    type="number"
                    step="0.001"
                    min={0}
                    value={tonnes}
                    onChange={(e) => setTonnes(e.target.value)}
                  />
                  <FieldError errors={state.fieldErrors["data.tonnes"]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="freightDistanceKm">Distance (km)</FieldLabel>
                  <Input
                    id="freightDistanceKm"
                    type="number"
                    step="0.1"
                    min={0}
                    value={freightDistanceKm}
                    onChange={(e) => setFreightDistanceKm(e.target.value)}
                  />
                  <FieldError errors={state.fieldErrors["data.distanceKm"]} />
                </Field>
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
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="freightOrigin">Origin (optional)</FieldLabel>
                  <Input
                    id="freightOrigin"
                    value={freightOrigin}
                    onChange={(e) => setFreightOrigin(e.target.value)}
                    placeholder="Lisbon DC"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="freightDestination">
                    Destination (optional)
                  </FieldLabel>
                  <Input
                    id="freightDestination"
                    value={freightDestination}
                    onChange={(e) => setFreightDestination(e.target.value)}
                    placeholder="Porto warehouse"
                  />
                </Field>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Annual emissions = factor × tonnes × distance (t.km).
              </p>
            </div>
          ) : isCommuting ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Commuting details
              </p>
              <Field>
                <FieldLabel htmlFor="commutingMode">Mode</FieldLabel>
                <select
                  id="commutingMode"
                  value={commutingMode}
                  onChange={(e) =>
                    setCommutingMode(e.target.value as EmployeeCommutingMode)
                  }
                  className={selectClass}
                >
                  {EMPLOYEE_COMMUTING_MODES.map((m) => (
                    <option key={m} value={m}>
                      {COMMUTING_MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="distancePerDayKm">
                    Distance / day (km)
                  </FieldLabel>
                  <Input
                    id="distancePerDayKm"
                    type="number"
                    step="0.1"
                    min={0}
                    value={distancePerDayKm}
                    onChange={(e) => setDistancePerDayKm(e.target.value)}
                    placeholder="Round-trip"
                  />
                  <FieldError errors={state.fieldErrors["data.distancePerDayKm"]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="daysPerYear">Days / year</FieldLabel>
                  <Input
                    id="daysPerYear"
                    type="number"
                    min={1}
                    max={365}
                    value={daysPerYear}
                    onChange={(e) => setDaysPerYear(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="employees">Employees</FieldLabel>
                  <Input
                    id="employees"
                    type="number"
                    min={1}
                    value={employees}
                    onChange={(e) => setEmployees(e.target.value)}
                  />
                </Field>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Annual emissions = factor × distance × days × employees.
                Walk + bicycle modes record as zero emissions.
              </p>
            </div>
          ) : isTravel ? (
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
