import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// vi.mock is hoisted to the top of the file, so any variables it
// references must be hoisted too. `vi.hoisted` is the supported way.
const { findManyMock, linkCountMock, fuelCountMock, elecCountMock } = vi.hoisted(
  () => ({
    findManyMock: vi.fn(),
    linkCountMock: vi.fn(),
    fuelCountMock: vi.fn(),
    elecCountMock: vi.fn(),
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wasteFlow: { findMany: findManyMock },
    fuelEntry: { count: fuelCountMock },
    electricityEntry: { count: elecCountMock },
    documentLink: { count: linkCountMock },
  },
}));

import { dataQualityGenerator } from "./data-quality";

const ctx = { companyId: "c1" };

beforeEach(() => {
  findManyMock.mockReset();
  linkCountMock.mockReset();
  fuelCountMock.mockReset();
  elecCountMock.mockReset();
  // Default: no carbon entries → no docs-related insights.
  fuelCountMock.mockResolvedValue(0);
  elecCountMock.mockResolvedValue(0);
  linkCountMock.mockResolvedValue(0);
});

describe("dataQualityGenerator — waste flows", () => {
  it("emits a critical insight for hazardous flows without treatment code", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "f1",
        isHazardous: true,
        treatmentCode: null,
        wasteCodeId: "code-1",
        siteId: "s1",
        locationName: null,
        estimatedQuantity: 1,
        categoryId: "cat-1",
      },
    ]);
    const out = await dataQualityGenerator(ctx);
    const haz = out.find((i) => i.id === "wf-haz-no-treatment");
    expect(haz).toBeDefined();
    expect(haz!.severity).toBe("critical");
    expect(haz!.message).toContain("1 hazardous waste flow");
  });

  it("emits a warning for flows missing LoW code", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "f1",
        isHazardous: false,
        treatmentCode: "R3",
        wasteCodeId: null, // missing
        siteId: "s1",
        locationName: null,
        estimatedQuantity: 1,
        categoryId: null,
      },
      {
        id: "f2",
        isHazardous: false,
        treatmentCode: "R3",
        wasteCodeId: null,
        siteId: "s1",
        locationName: null,
        estimatedQuantity: 1,
        categoryId: null,
      },
    ]);
    const out = await dataQualityGenerator(ctx);
    const missing = out.find((i) => i.id === "wf-missing-low-code");
    expect(missing).toBeDefined();
    expect(missing!.severity).toBe("warning");
    expect(missing!.message).toContain("2 flows");
  });

  it("doesn't nag about quantities when fewer than 5 flows exist", async () => {
    findManyMock.mockResolvedValue(
      Array.from({ length: 4 }, (_, i) => ({
        id: `f${i}`,
        isHazardous: false,
        treatmentCode: "R3",
        wasteCodeId: "code",
        siteId: "s1",
        locationName: null,
        estimatedQuantity: null, // would normally trigger
        categoryId: "cat",
      })),
    );
    const out = await dataQualityGenerator(ctx);
    expect(out.find((i) => i.id === "wf-no-quantity")).toBeUndefined();
  });

  it("does nag about quantities once there are 5+ flows", async () => {
    findManyMock.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => ({
        id: `f${i}`,
        isHazardous: false,
        treatmentCode: "R3",
        wasteCodeId: "code",
        siteId: "s1",
        locationName: null,
        estimatedQuantity: i < 3 ? 1 : null,
        categoryId: "cat",
      })),
    );
    const out = await dataQualityGenerator(ctx);
    const insight = out.find((i) => i.id === "wf-no-quantity");
    expect(insight).toBeDefined();
    expect(insight!.message).toContain("3");
  });

  it("emits no insights when all flows are clean", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "f1",
        isHazardous: true,
        treatmentCode: "R3",
        wasteCodeId: "code",
        siteId: "s1",
        locationName: null,
        estimatedQuantity: 1,
        categoryId: "cat",
      },
    ]);
    const out = await dataQualityGenerator(ctx);
    expect(out).toEqual([]);
  });
});

describe("dataQualityGenerator — supporting documents", () => {
  beforeEach(() => {
    findManyMock.mockResolvedValue([]); // no flows = no flow-level insights
  });

  it("flags Scope 1 entries with zero attached documents (≥ 3 entries)", async () => {
    fuelCountMock.mockResolvedValue(5);
    linkCountMock.mockImplementation(({ where }) =>
      where?.module === "scope-1" ? Promise.resolve(0) : Promise.resolve(0),
    );
    const out = await dataQualityGenerator(ctx);
    const insight = out.find((i) => i.id === "scope1-no-docs");
    expect(insight).toBeDefined();
    expect(insight!.severity).toBe("warning");
  });

  it("doesn't flag below the 3-entry threshold", async () => {
    fuelCountMock.mockResolvedValue(2);
    linkCountMock.mockResolvedValue(0);
    const out = await dataQualityGenerator(ctx);
    expect(out.find((i) => i.id === "scope1-no-docs")).toBeUndefined();
  });
});
