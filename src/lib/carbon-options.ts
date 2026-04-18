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
