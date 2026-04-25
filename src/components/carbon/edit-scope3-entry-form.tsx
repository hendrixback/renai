"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  updateScope3Entry,
  type SimpleState,
} from "@/app/(app)/carbon-footprint/value-chain/actions";
import {
  BUSINESS_TRAVEL_MODES,
  EMPLOYEE_COMMUTING_MODES,
  FREIGHT_MODES,
  FUEL_ENERGY_SUBTYPES,
  PURCHASED_GOODS_SECTORS,
  type BusinessTravelMode,
  type EmployeeCommutingMode,
  type FreightMode,
  type FuelEnergySubtype,
  type PurchasedGoodsSector,
  type Scope3CategoryValue,
} from "@/lib/schemas/scope3.schema";
import { REGIONS } from "@/lib/carbon-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Site = { id: string; name: string };
type WasteFlow = { id: string; name: string };

const empty: SimpleState = { error: null, success: null, fieldErrors: {} };

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

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

const FUEL_ENERGY_LABELS: Record<FuelEnergySubtype, { label: string; unit: string }> = {
  wtt_diesel: { label: "Diesel — upstream (WTT)", unit: "L" },
  wtt_petrol: { label: "Petrol — upstream (WTT)", unit: "L" },
  wtt_natural_gas: { label: "Natural gas — upstream (WTT)", unit: "m³" },
  wtt_lpg: { label: "LPG — upstream (WTT)", unit: "L" },
  wtt_heating_oil: { label: "Heating oil — upstream (WTT)", unit: "L" },
  wtt_coal: { label: "Coal — upstream (WTT)", unit: "kg" },
  wtt_electricity: { label: "Electricity — upstream + T&D losses", unit: "kWh" },
};

const PURCHASED_GOODS_LABELS: Record<PurchasedGoodsSector, string> = {
  food_beverage_tobacco: "Food, beverage & tobacco",
  textile_apparel: "Textiles & apparel",
  chemicals_plastics: "Chemicals & plastics",
  metals_basic: "Basic metals",
  machinery_equipment: "Machinery & equipment",
  construction: "Construction materials",
  electronics: "Electronics",
  pharmaceuticals: "Pharmaceuticals",
  transport_services: "Transport services",
  professional_services: "Professional services",
  it_services: "IT services",
  admin_services: "Admin services",
  utilities: "Utilities",
  retail_wholesale: "Retail / wholesale",
  other_manufacturing: "Other manufacturing",
  other_services: "Other services",
};

export type Scope3EntryInitial = {
  id: string;
  category: Scope3CategoryValue;
  description: string;
  month: string; // YYYY-MM
  siteId: string | null;
  notes: string | null;
  // BUSINESS_TRAVEL fields (populated when category matches).
  travelMode: BusinessTravelMode | null;
  distanceKm: string;
  passengers: string;
  nights: string;
  region: string;
  origin: string;
  destination: string;
  // EMPLOYEE_COMMUTING fields (populated when category matches).
  commutingMode: EmployeeCommutingMode | null;
  distancePerDayKm: string;
  daysPerYear: string;
  employees: string;
  // FREIGHT fields (UPSTREAM_TRANSPORT or DOWNSTREAM_TRANSPORT).
  freightMode: FreightMode | null;
  tonnes: string;
  freightDistanceKm: string;
  freightOrigin: string;
  freightDestination: string;
  // WASTE_GENERATED reference
  wasteFlowId: string;
  // FUEL_ENERGY_RELATED (Cat 3 / WTT)
  fuelEnergySubtype: FuelEnergySubtype | null;
  fuelEnergyQuantity: string;
  // PURCHASED_GOODS_SERVICES (Cat 1 / spend-based)
  purchasedSector: PurchasedGoodsSector | null;
  purchasedSpend: string;
  purchasedSupplier: string;
  // Generic fallback
  amount: string;
  amountUnit: string;
  kgCo2eOverride: string;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function EditScope3EntryForm({
  entry,
  sites,
  wasteFlows = [],
}: {
  entry: Scope3EntryInitial;
  sites: Site[];
  wasteFlows?: WasteFlow[];
}) {
  const router = useRouter();
  const [state, setState] = React.useState<SimpleState>(empty);
  const [pending, start] = React.useTransition();

  const [description, setDescription] = React.useState(entry.description);
  const [month, setMonth] = React.useState(entry.month);
  const [siteId, setSiteId] = React.useState(entry.siteId ?? "");
  const [notes, setNotes] = React.useState(entry.notes ?? "");

  const [travelMode, setTravelMode] = React.useState<BusinessTravelMode>(
    entry.travelMode ?? "air_long_haul",
  );
  const [distanceKm, setDistanceKm] = React.useState(entry.distanceKm);
  const [passengers, setPassengers] = React.useState(entry.passengers || "1");
  const [nights, setNights] = React.useState(entry.nights);
  const [region, setRegion] = React.useState(entry.region || "GLOBAL");
  const [origin, setOrigin] = React.useState(entry.origin);
  const [destination, setDestination] = React.useState(entry.destination);

  const [commutingMode, setCommutingMode] = React.useState<EmployeeCommutingMode>(
    entry.commutingMode ?? "car_petrol_avg",
  );
  const [distancePerDayKm, setDistancePerDayKm] = React.useState(
    entry.distancePerDayKm,
  );
  const [daysPerYear, setDaysPerYear] = React.useState(entry.daysPerYear || "220");
  const [employees, setEmployees] = React.useState(entry.employees || "1");

  const [freightMode, setFreightMode] = React.useState<FreightMode>(
    entry.freightMode ?? "truck_avg",
  );
  const [tonnes, setTonnes] = React.useState(entry.tonnes);
  const [freightDistanceKm, setFreightDistanceKm] = React.useState(
    entry.freightDistanceKm,
  );
  const [freightOrigin, setFreightOrigin] = React.useState(entry.freightOrigin);
  const [freightDestination, setFreightDestination] = React.useState(
    entry.freightDestination,
  );

  const [wasteFlowId, setWasteFlowId] = React.useState(entry.wasteFlowId);

  const [fuelEnergySubtype, setFuelEnergySubtype] = React.useState<FuelEnergySubtype>(
    entry.fuelEnergySubtype ?? "wtt_diesel",
  );
  const [fuelEnergyQuantity, setFuelEnergyQuantity] = React.useState(
    entry.fuelEnergyQuantity,
  );

  const [purchasedSector, setPurchasedSector] = React.useState<PurchasedGoodsSector>(
    entry.purchasedSector ?? "other_manufacturing",
  );
  const [purchasedSpend, setPurchasedSpend] = React.useState(entry.purchasedSpend);
  const [purchasedSupplier, setPurchasedSupplier] = React.useState(
    entry.purchasedSupplier,
  );

  const [amount, setAmount] = React.useState(entry.amount);
  const [amountUnit, setAmountUnit] = React.useState(entry.amountUnit);
  const [kgCo2eOverride, setKgCo2eOverride] = React.useState(entry.kgCo2eOverride);

  const isTravel = entry.category === "BUSINESS_TRAVEL";
  const isCommuting = entry.category === "EMPLOYEE_COMMUTING";
  const isFreight =
    entry.category === "UPSTREAM_TRANSPORT" ||
    entry.category === "DOWNSTREAM_TRANSPORT";
  const isWasteRef = entry.category === "WASTE_GENERATED";
  const isFuelEnergy = entry.category === "FUEL_ENERGY_RELATED";
  const isPurchased = entry.category === "PURCHASED_GOODS_SERVICES";
  const isHotel = isTravel && travelMode === "hotel_night";

  function buildPayload(): Record<string, unknown> {
    if (isTravel) {
      const data: Record<string, unknown> = {
        mode: travelMode,
        passengers: Number(passengers || "1"),
        region,
      };
      if (isHotel) {
        if (nights) data.nights = Number(nights);
      } else {
        if (distanceKm) data.distanceKm = Number(distanceKm);
      }
      if (origin) data.origin = origin;
      if (destination) data.destination = destination;
      return {
        description,
        month,
        siteId: siteId || undefined,
        notes: notes || undefined,
        data,
      };
    }
    if (isCommuting) {
      const data: Record<string, unknown> = {
        mode: commutingMode,
        distancePerDayKm: Number(distancePerDayKm || "0"),
        daysPerYear: Number(daysPerYear || "220"),
        employees: Number(employees || "1"),
        region,
      };
      return {
        description,
        month,
        siteId: siteId || undefined,
        notes: notes || undefined,
        data,
      };
    }
    if (isFreight) {
      const data: Record<string, unknown> = {
        mode: freightMode,
        tonnes: Number(tonnes || "0"),
        distanceKm: Number(freightDistanceKm || "0"),
        region,
      };
      if (freightOrigin) data.origin = freightOrigin;
      if (freightDestination) data.destination = freightDestination;
      return {
        description,
        month,
        siteId: siteId || undefined,
        notes: notes || undefined,
        data,
      };
    }
    if (isWasteRef) {
      const matched = wasteFlows.find((w) => w.id === wasteFlowId);
      const data: Record<string, unknown> = { wasteFlowId };
      if (matched) data.wasteFlowName = matched.name;
      return {
        description,
        month,
        siteId: siteId || undefined,
        notes: notes || undefined,
        data,
      };
    }
    if (isFuelEnergy) {
      const data: Record<string, unknown> = {
        subtype: fuelEnergySubtype,
        quantity: Number(fuelEnergyQuantity || "0"),
        unit: FUEL_ENERGY_LABELS[fuelEnergySubtype].unit,
        region,
      };
      return {
        description,
        month,
        siteId: siteId || undefined,
        notes: notes || undefined,
        data,
      };
    }
    if (isPurchased) {
      const data: Record<string, unknown> = {
        sector: purchasedSector,
        spendEur: Number(purchasedSpend || "0"),
        region,
      };
      if (purchasedSupplier) data.supplier = purchasedSupplier;
      return {
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
      description,
      month,
      siteId: siteId || undefined,
      notes: notes || undefined,
      data,
    };
  }

  function handleSave() {
    start(async () => {
      const result = await updateScope3Entry(entry.id, buildPayload());
      setState(result);
      if (result.success) {
        setTimeout(() => {
          router.push(`/carbon-footprint/value-chain/${entry.id}`);
          router.refresh();
        }, 400);
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Scope 3 entry</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              <FieldLabel htmlFor="siteId">Plant / Site</FieldLabel>
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

          {isPurchased ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Purchased goods & services
              </p>
              <Field>
                <FieldLabel htmlFor="purchasedSector">Sector</FieldLabel>
                <select
                  id="purchasedSector"
                  value={purchasedSector}
                  onChange={(e) =>
                    setPurchasedSector(e.target.value as PurchasedGoodsSector)
                  }
                  className={selectClass}
                >
                  {PURCHASED_GOODS_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {PURCHASED_GOODS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="purchasedSpend">Spend (EUR)</FieldLabel>
                  <Input
                    id="purchasedSpend"
                    type="number"
                    step="0.01"
                    min={0}
                    value={purchasedSpend}
                    onChange={(e) => setPurchasedSpend(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="purchasedSupplier">
                    Supplier (optional)
                  </FieldLabel>
                  <Input
                    id="purchasedSupplier"
                    value={purchasedSupplier}
                    onChange={(e) => setPurchasedSupplier(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          ) : isFuelEnergy ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Fuel & energy (well-to-tank)
              </p>
              <Field>
                <FieldLabel htmlFor="fuelEnergySubtype">Resource</FieldLabel>
                <select
                  id="fuelEnergySubtype"
                  value={fuelEnergySubtype}
                  onChange={(e) =>
                    setFuelEnergySubtype(e.target.value as FuelEnergySubtype)
                  }
                  className={selectClass}
                >
                  {FUEL_ENERGY_SUBTYPES.map((s) => (
                    <option key={s} value={s}>
                      {FUEL_ENERGY_LABELS[s].label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="fuelEnergyQuantity">
                    Quantity ({FUEL_ENERGY_LABELS[fuelEnergySubtype].unit})
                  </FieldLabel>
                  <Input
                    id="fuelEnergyQuantity"
                    type="number"
                    step="0.001"
                    min={0}
                    value={fuelEnergyQuantity}
                    onChange={(e) => setFuelEnergyQuantity(e.target.value)}
                  />
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
            </div>
          ) : isWasteRef ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Waste flow link
              </p>
              {wasteFlows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active waste flows available.
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
                </Field>
              )}
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
                  />
                </Field>
              </div>
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
                  />
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
            </div>
          ) : isTravel ? (
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
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="destination">
                      Destination (optional)
                    </FieldLabel>
                    <Input
                      id="destination"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Quick entry
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
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
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

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={pending}
            render={
              <Link href={`/carbon-footprint/value-chain/${entry.id}`}>
                Cancel
              </Link>
            }
          />
          <Button onClick={handleSave} disabled={pending}>
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
