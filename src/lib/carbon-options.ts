// Client-safe option catalogs for the Carbon Footprint register dialogs.
// Kept in a separate file (no `server-only`, no Prisma imports) so client
// components can import it without dragging the whole carbon server lib
// into the browser bundle.

export const FUEL_TYPES = [
  { value: "diesel", label: "Diesel", unit: "L" },
  { value: "petrol", label: "Petrol", unit: "L" },
  { value: "natural_gas", label: "Natural gas (volume)", unit: "m3" },
  { value: "natural_gas_kwh", label: "Natural gas (energy)", unit: "kWh" },
  { value: "lpg", label: "LPG", unit: "L" },
  { value: "heating_oil", label: "Heating oil", unit: "L" },
  { value: "coal", label: "Coal", unit: "kg" },
  { value: "biodiesel", label: "Biodiesel", unit: "L" },
  { value: "wood_pellets", label: "Wood pellets", unit: "kg" },
] as const;

export const FUEL_UNIT_OPTIONS = [
  { value: "L", label: "Liters" },
  { value: "m3", label: "m³" },
  { value: "kg", label: "kg" },
  { value: "kWh", label: "kWh" },
] as const;

export const REGIONS = [
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Spain" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "UK", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "EU", label: "EU average" },
  { value: "GLOBAL", label: "Global average" },
] as const;

/**
 * Scope 1 emission source classification (Spec §10.4).
 *
 * Independent from fuel type: the same fuel (e.g. diesel) can be burned
 * as STATIONARY_COMBUSTION (a backup generator on site) or MOBILE_COMBUSTION
 * (a delivery truck), and those are reported separately in audits.
 */
export const EMISSION_SOURCE_TYPES = [
  { value: "STATIONARY_COMBUSTION", label: "Stationary combustion" },
  { value: "MOBILE_COMBUSTION", label: "Mobile combustion" },
  { value: "COMPANY_VEHICLES", label: "Company vehicles" },
  { value: "BOILERS", label: "Boilers" },
  { value: "GENERATORS", label: "Generators" },
  { value: "NATURAL_GAS_USE", label: "Natural gas use" },
  { value: "DIESEL_USE", label: "Diesel use" },
  { value: "LPG_USE", label: "LPG use" },
  { value: "GASOLINE_USE", label: "Gasoline use" },
  { value: "PROCESS_EMISSIONS", label: "Process emissions" },
  { value: "FUGITIVE_EMISSIONS", label: "Fugitive emissions" },
] as const;

export type EmissionSourceTypeValue =
  (typeof EMISSION_SOURCE_TYPES)[number]["value"];
