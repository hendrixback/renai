import { beforeEach, describe, expect, it, vi } from "vitest";

const { fuelFindMany, electricityFindMany, scope3FindMany, wasteFlowFindMany, computeWasteImpactMock } =
  vi.hoisted(() => ({
    fuelFindMany: vi.fn(),
    electricityFindMany: vi.fn(),
    scope3FindMany: vi.fn(),
    wasteFlowFindMany: vi.fn(),
    computeWasteImpactMock: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fuelEntry: { findMany: fuelFindMany },
    electricityEntry: { findMany: electricityFindMany },
    scope3Entry: { findMany: scope3FindMany },
    wasteFlow: { findMany: wasteFlowFindMany },
  },
}));
vi.mock("@/lib/carbon", () => ({
  computeWasteImpact: computeWasteImpactMock,
}));

import { getAnalysisData } from "./analysis";
import { parseAnalysisFilters } from "./analysis-filters";

const FIXED_NOW = new Date("2026-04-25T00:00:00Z");

beforeEach(() => {
  fuelFindMany.mockReset();
  electricityFindMany.mockReset();
  scope3FindMany.mockReset();
  wasteFlowFindMany.mockReset();
  computeWasteImpactMock.mockReset();
});

function setupFixtures() {
  fuelFindMany.mockResolvedValue([
    {
      id: "f1",
      fuelType: "diesel",
      emissionSourceType: "MOBILE_COMBUSTION",
      kgCo2e: 1000, // 1 tCO₂e
      reportingMonth: 3,
      month: new Date("2026-03-15"),
      siteId: "site-A",
      site: { name: "Lisbon" },
      emissionFactorId: "f-1",
      notes: null,
    },
    {
      id: "f2",
      fuelType: "natural_gas",
      emissionSourceType: null,
      kgCo2e: 500,
      reportingMonth: 5,
      month: new Date("2026-05-01"),
      siteId: null,
      site: null,
      emissionFactorId: null,
      notes: "boiler",
    },
  ]);
  electricityFindMany.mockResolvedValue([
    {
      id: "e1",
      kgCo2e: 200,
      marketBasedKgCo2e: 100, // takes precedence over kgCo2e
      reportingMonth: 3,
      month: new Date("2026-03-01"),
      siteId: "site-A",
      site: { name: "Lisbon" },
      energyProvider: "EDP",
      emissionFactorId: "e-1",
    },
  ]);
  scope3FindMany.mockResolvedValue([
    {
      id: "x1",
      category: "BUSINESS_TRAVEL",
      description: "Q1 travel",
      kgCo2e: 800,
      reportingMonth: 4,
      month: new Date("2026-04-10"),
      siteId: null,
      site: null,
      emissionFactorId: "x-1",
    },
  ]);
  computeWasteImpactMock.mockResolvedValue([
    { id: "w1", name: "PET", currentKgCo2e: 1200 },
    { id: "w2", name: "Paper", currentKgCo2e: null },
  ]);
  wasteFlowFindMany.mockResolvedValue([
    {
      id: "w1",
      name: "PET bottles",
      status: "ACTIVE",
      estimatedQuantity: 1, // 1 ton
      quantityUnit: "TON",
      frequency: "MONTHLY",
      isHazardous: false,
      treatmentCode: "R3",
      wasteCodeId: "code-1",
      siteId: "site-A",
      site: { name: "Lisbon" },
      category: { id: "c1", name: "Plastic", slug: "plastic" },
    },
    {
      id: "w2",
      name: "Hazardous solvent",
      status: "ACTIVE",
      estimatedQuantity: 100,
      quantityUnit: "KG",
      frequency: "MONTHLY",
      isHazardous: true,
      treatmentCode: null,
      wasteCodeId: null,
      siteId: null,
      site: null,
      category: { id: "c2", name: "Hazardous", slug: "hazardous-chemical" },
    },
  ]);
}

describe("getAnalysisData (current-year only)", () => {
  it("aggregates per-scope totals from mocked entries", async () => {
    setupFixtures();
    const filters = parseAnalysisFilters({}, FIXED_NOW);
    const result = await getAnalysisData("co1", filters);

    expect(result.current.s1).toBe(1500); // 1000 + 500
    // Electricity uses marketBasedKgCo2e (100) when present
    expect(result.current.s2).toBe(100);
    expect(result.current.s3).toBe(800);
    expect(result.current.waste).toBe(1200);
    expect(result.current.total).toBe(3600);
    expect(result.prior).toBeNull();
  });

  it("places monthly Scope 1 emissions under their reportingMonth", async () => {
    setupFixtures();
    const filters = parseAnalysisFilters({}, FIXED_NOW);
    const result = await getAnalysisData("co1", filters);

    // Diesel landed in March (idx 2), natural gas in May (idx 4)
    expect(result.monthly[2].s1).toBe(1000);
    expect(result.monthly[4].s1).toBe(500);
    // Waste impact spread evenly across months: 1200/12 = 100
    expect(result.monthly[0].waste).toBeCloseTo(100, 4);
    expect(result.monthly[11].waste).toBeCloseTo(100, 4);
  });

  it("breaks down emissions by site (unassigned bucket for null site)", async () => {
    setupFixtures();
    const filters = parseAnalysisFilters({}, FIXED_NOW);
    const result = await getAnalysisData("co1", filters);

    const lisbon = result.bySite.find((s) => s.siteId === "site-A");
    expect(lisbon).toBeDefined();
    expect(lisbon?.s1).toBe(1000);
    expect(lisbon?.s2).toBe(100);

    const unassigned = result.bySite.find(
      (s) => s.name === "Unassigned" && s.siteId === null,
    );
    expect(unassigned).toBeDefined();
    // 500 (natural gas, no site) + 800 (s3, no site) + 1200 (waste, no site)
    expect(unassigned?.total).toBe(2500);
  });

  it("sorts top sources descending and caps to 10", async () => {
    setupFixtures();
    const filters = parseAnalysisFilters({}, FIXED_NOW);
    const result = await getAnalysisData("co1", filters);

    expect(result.topSources.length).toBeLessThanOrEqual(10);
    expect(result.topSources[0].kgCo2e).toBe(1000); // diesel
    expect(result.topSources[1].kgCo2e).toBe(800); // travel
    expect(result.topSources[2].kgCo2e).toBe(500); // natural gas
    expect(result.topSources[3].kgCo2e).toBe(100); // electricity
  });

  it("computes waste summary counts and missing-field signals", async () => {
    setupFixtures();
    const filters = parseAnalysisFilters({}, FIXED_NOW);
    const result = await getAnalysisData("co1", filters);

    expect(result.wasteSummary.totalFlows).toBe(2);
    expect(result.wasteSummary.recoveryCount).toBe(1); // R3
    expect(result.wasteSummary.disposalCount).toBe(0);
    expect(result.wasteSummary.untreatedCount).toBe(1);
    expect(result.wasteSummary.hazardousCount).toBe(1);
    expect(result.dataQuality.wasteFlowsMissingCode).toBe(1);
    expect(result.dataQuality.wasteFlowsMissingTreatment).toBe(1);
    expect(result.dataQuality.wasteFlowsHazardousNoCode).toBe(1);
    // electricity factor present, scope3 factor present, fuel #2 missing → 1
    expect(result.dataQuality.recordsMissingFactor).toBe(1);
    expect(result.dataQuality.scope1MissingSourceType).toBe(1);
  });

  it("breaks down Scope 1 by fuel type and Scope 3 by category", async () => {
    setupFixtures();
    const filters = parseAnalysisFilters({}, FIXED_NOW);
    const result = await getAnalysisData("co1", filters);

    expect(result.byFuel).toEqual([
      { key: "diesel", label: "Diesel", value: 1000 },
      { key: "natural_gas", label: "Natural Gas", value: 500 },
    ]);
    expect(result.byScope3Category).toEqual([
      { key: "BUSINESS_TRAVEL", label: "Business travel", value: 800 },
    ]);
  });
});

describe("getAnalysisData with YoY toggle", () => {
  it("loads prior-year totals when yoy=1", async () => {
    setupFixtures();
    const filters = parseAnalysisFilters({ yoy: "1" }, FIXED_NOW);
    await getAnalysisData("co1", filters);

    // Each prisma findMany should be called once for the current year and
    // again for the prior year. The first call has reportingYear=2026,
    // the second reportingYear=2025.
    expect(fuelFindMany).toHaveBeenCalledTimes(2);
    expect(fuelFindMany.mock.calls[0][0].where.reportingYear).toBe(2026);
    expect(fuelFindMany.mock.calls[1][0].where.reportingYear).toBe(2025);
  });

  it("returns prior totals separately so the UI can compute deltas", async () => {
    fuelFindMany.mockImplementation(({ where }) => {
      if (where.reportingYear === 2026) {
        return Promise.resolve([
          {
            id: "f-current",
            fuelType: "diesel",
            emissionSourceType: "MOBILE_COMBUSTION",
            kgCo2e: 2000,
            reportingMonth: 1,
            month: new Date("2026-01-01"),
            siteId: null,
            site: null,
            emissionFactorId: "f-1",
            notes: null,
          },
        ]);
      }
      return Promise.resolve([
        {
          id: "f-prior",
          fuelType: "diesel",
          emissionSourceType: "MOBILE_COMBUSTION",
          kgCo2e: 1000,
          reportingMonth: 1,
          month: new Date("2025-01-01"),
          siteId: null,
          site: null,
          emissionFactorId: "f-1",
          notes: null,
        },
      ]);
    });
    electricityFindMany.mockResolvedValue([]);
    scope3FindMany.mockResolvedValue([]);
    computeWasteImpactMock.mockResolvedValue([]);
    wasteFlowFindMany.mockResolvedValue([]);

    const filters = parseAnalysisFilters({ yoy: "1" }, FIXED_NOW);
    const result = await getAnalysisData("co1", filters);

    expect(result.current.s1).toBe(2000);
    expect(result.prior?.s1).toBe(1000);
  });
});

describe("getAnalysisData with scope filtering", () => {
  it("skips Scope 2 + Scope 3 queries when those scopes are deselected", async () => {
    fuelFindMany.mockResolvedValue([]);
    wasteFlowFindMany.mockResolvedValue([]);
    computeWasteImpactMock.mockResolvedValue([]);

    const filters = parseAnalysisFilters({ scopes: "s1,waste" }, FIXED_NOW);
    await getAnalysisData("co1", filters);

    expect(fuelFindMany).toHaveBeenCalledTimes(1);
    expect(electricityFindMany).not.toHaveBeenCalled();
    expect(scope3FindMany).not.toHaveBeenCalled();
    expect(computeWasteImpactMock).toHaveBeenCalledTimes(1);
  });
});
