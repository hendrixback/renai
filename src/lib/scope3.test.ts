import { describe, expect, it, vi, beforeEach } from "vitest";

// vi.mock is hoisted above imports — use vi.hoisted so the mock fn is in
// scope when the factory runs.
const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { emissionFactor: { findFirst } },
}));

import {
  computeBusinessTravelEmission,
  computeEmployeeCommutingEmission,
  computeFreightEmission,
} from "./scope3";

const baseFactor = {
  id: "factor-1",
  category: "BUSINESS_TRAVEL" as const,
  subtype: "air_long_haul",
  unit: "pkm",
  kgCo2ePerUnit: 0.14981,
  source: "DEFRA 2024",
  region: "GLOBAL",
  year: 2024,
  notes: null,
  companyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  findFirst.mockReset();
});

describe("computeBusinessTravelEmission", () => {
  it("scales by distance × passengers for shared travel modes", async () => {
    findFirst.mockResolvedValueOnce(baseFactor);
    const result = await computeBusinessTravelEmission("co1", {
      mode: "air_long_haul",
      distanceKm: 1000,
      passengers: 2,
      region: "GLOBAL",
    });
    // 0.14981 × 1000 × 2 = 299.62
    expect(result.kgCo2e).toBeCloseTo(299.62, 2);
    expect(result.factorId).toBe("factor-1");
    expect(result.factorSnapshot).toMatchObject({
      source: "DEFRA 2024",
      year: 2024,
      type: "air_long_haul",
    });
  });

  it("ignores passengers for car modes (per vehicle.km)", async () => {
    findFirst.mockResolvedValueOnce({
      ...baseFactor,
      subtype: "car_petrol_avg",
      unit: "km",
      kgCo2ePerUnit: 0.16844,
    });
    const result = await computeBusinessTravelEmission("co1", {
      mode: "car_petrol_avg",
      distanceKm: 100,
      passengers: 4, // four people in the car — same emissions as one
      region: "GLOBAL",
    });
    expect(result.kgCo2e).toBeCloseTo(16.844, 2);
  });

  it("uses nights for hotel_night and ignores distance", async () => {
    findFirst.mockResolvedValueOnce({
      ...baseFactor,
      subtype: "hotel_night",
      unit: "night",
      kgCo2ePerUnit: 10.4,
    });
    const result = await computeBusinessTravelEmission("co1", {
      mode: "hotel_night",
      nights: 3,
      passengers: 1,
      region: "GLOBAL",
    });
    expect(result.kgCo2e).toBeCloseTo(31.2, 2);
  });

  it("returns nulls when no factor matches the subtype", async () => {
    // All four findFirst calls return null (own / regional / global / any).
    findFirst.mockResolvedValue(null);
    const result = await computeBusinessTravelEmission("co1", {
      mode: "air_long_haul",
      distanceKm: 500,
      passengers: 1,
      region: "MARS",
    });
    expect(result).toEqual({
      factorId: null,
      kgCo2e: null,
      factorSnapshot: null,
    });
  });

  it("applies preference order — company override beats regional", async () => {
    // First call (company-specific) returns a factor → other lookups skipped.
    const own = { ...baseFactor, id: "company-factor", kgCo2ePerUnit: 0.10 };
    findFirst.mockResolvedValueOnce(own);
    const result = await computeBusinessTravelEmission("co1", {
      mode: "air_long_haul",
      distanceKm: 1000,
      passengers: 1,
      region: "GLOBAL",
    });
    expect(result.factorId).toBe("company-factor");
    expect(result.kgCo2e).toBeCloseTo(100, 2);
    // Only one DB call — regional + global lookups should not have run.
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});

describe("computeEmployeeCommutingEmission", () => {
  it("multiplies factor × distance × days × employees", async () => {
    findFirst.mockResolvedValueOnce({
      ...baseFactor,
      category: "EMPLOYEE_COMMUTING",
      subtype: "car_petrol_avg",
      unit: "km",
      kgCo2ePerUnit: 0.16844,
    });
    const result = await computeEmployeeCommutingEmission("co1", {
      mode: "car_petrol_avg",
      distancePerDayKm: 30,
      daysPerYear: 220,
      employees: 5,
      region: "GLOBAL",
    });
    // 0.16844 × 30 × 220 × 5 ≈ 5558.52
    expect(result.kgCo2e).toBeCloseTo(5558.52, 1);
    expect(result.factorId).toBe("factor-1");
  });

  it("short-circuits to 0 emissions for walk + bicycle (no DB lookup)", async () => {
    const walk = await computeEmployeeCommutingEmission("co1", {
      mode: "walk",
      distancePerDayKm: 2,
      daysPerYear: 220,
      employees: 1,
      region: "GLOBAL",
    });
    const bike = await computeEmployeeCommutingEmission("co1", {
      mode: "bicycle",
      distancePerDayKm: 5,
      daysPerYear: 220,
      employees: 3,
      region: "GLOBAL",
    });
    expect(walk).toEqual({ factorId: null, kgCo2e: 0, factorSnapshot: null });
    expect(bike).toEqual({ factorId: null, kgCo2e: 0, factorSnapshot: null });
    // Zero-emission modes should not hit the factor table at all.
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns nulls when factor cannot be resolved", async () => {
    findFirst.mockResolvedValue(null);
    const result = await computeEmployeeCommutingEmission("co1", {
      mode: "scooter",
      distancePerDayKm: 10,
      daysPerYear: 220,
      employees: 1,
      region: "MARS",
    });
    expect(result).toEqual({
      factorId: null,
      kgCo2e: null,
      factorSnapshot: null,
    });
  });
});

describe("computeFreightEmission", () => {
  it("multiplies factor × tonnes × distance (t.km)", async () => {
    findFirst.mockResolvedValueOnce({
      ...baseFactor,
      category: "TRANSPORT",
      subtype: "truck_avg",
      unit: "tkm",
      kgCo2ePerUnit: 0.10560,
    });
    const result = await computeFreightEmission("co1", {
      mode: "truck_avg",
      tonnes: 5,
      distanceKm: 200,
      region: "GLOBAL",
    });
    // 0.10560 × 5 × 200 = 105.6
    expect(result.kgCo2e).toBeCloseTo(105.6, 2);
    expect(result.factorId).toBe("factor-1");
    expect(result.factorSnapshot).toMatchObject({ type: "truck_avg" });
  });

  it("returns nulls when no factor exists for the freight mode", async () => {
    findFirst.mockResolvedValue(null);
    const result = await computeFreightEmission("co1", {
      mode: "air_freight_long_haul",
      tonnes: 1,
      distanceKm: 5000,
      region: "MARS",
    });
    expect(result).toEqual({
      factorId: null,
      kgCo2e: null,
      factorSnapshot: null,
    });
  });
});
