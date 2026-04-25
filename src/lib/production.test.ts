import { describe, expect, it, vi, beforeEach } from "vitest";

const { findMany, getCarbonSummaryMock } = vi.hoisted(() => ({
  findMany: vi.fn(),
  getCarbonSummaryMock: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { productionVolume: { findMany } },
}));
vi.mock("@/lib/carbon", () => ({
  getCarbonSummary: getCarbonSummaryMock,
}));

import { computePef } from "./production";

beforeEach(() => {
  findMany.mockReset();
  getCarbonSummaryMock.mockReset();
});

const carbon = {
  scope1: 4000,
  scope2: 6000,
  scope3: 10000,
  wasteCurrent: 0,
  wasteSavingPotential: 0,
  total: 20000,
  fuelEntryCount: 0,
  electricityEntryCount: 0,
  scope3EntryCount: 0,
  wasteFlowCount: 0,
};

describe("computePef", () => {
  it("sums production volume and divides emissions by it", async () => {
    getCarbonSummaryMock.mockResolvedValueOnce(carbon);
    findMany.mockResolvedValueOnce([
      { volume: 100, unit: "ton" },
      { volume: 200, unit: "ton" },
    ]);
    const r = await computePef({
      companyId: "co1",
      year: 2026,
      scopes: { s1: true, s2: true, s3: true },
    });
    // 4000+6000+10000 = 20000 numerator; 300 ton denom → 66.6667 kg/ton
    expect(r.numeratorKg).toBe(20000);
    expect(r.denominatorVolume).toBe(300);
    expect(r.denominatorUnit).toBe("ton");
    expect(r.pef).toBeCloseTo(66.6667, 3);
  });

  it("respects scope mask — S1+S2 excludes S3 from numerator", async () => {
    getCarbonSummaryMock.mockResolvedValueOnce(carbon);
    findMany.mockResolvedValueOnce([{ volume: 100, unit: "ton" }]);
    const r = await computePef({
      companyId: "co1",
      year: 2026,
      scopes: { s1: true, s2: true, s3: false },
    });
    expect(r.numeratorKg).toBe(10000);
    expect(r.byScope).toEqual({ s1: 4000, s2: 6000, s3: 0 });
    expect(r.pef).toBe(100);
  });

  it("returns null PEF when no production volume is registered", async () => {
    getCarbonSummaryMock.mockResolvedValueOnce(carbon);
    findMany.mockResolvedValueOnce([]);
    const r = await computePef({
      companyId: "co1",
      year: 2026,
      scopes: { s1: true, s2: true, s3: true },
    });
    expect(r.pef).toBeNull();
    expect(r.rowCount).toBe(0);
    // Numerator is still computed so the UI can show "20 tCO₂e ÷ —".
    expect(r.numeratorKg).toBe(20000);
  });

  it("refuses to compute PEF when multiple units coexist (data-quality flag)", async () => {
    getCarbonSummaryMock.mockResolvedValueOnce(carbon);
    findMany.mockResolvedValueOnce([
      { volume: 100, unit: "ton" },
      { volume: 5000, unit: "piece" },
    ]);
    const r = await computePef({
      companyId: "co1",
      year: 2026,
      scopes: { s1: true, s2: true, s3: true },
    });
    expect(r.pef).toBeNull();
    expect(r.unitMix).toEqual({ ton: 100, piece: 5000 });
    expect(r.denominatorUnit).toBe("ton + piece");
  });
});
