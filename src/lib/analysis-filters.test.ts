import { describe, expect, it } from "vitest";

import {
  ANALYSIS_SCOPE_OPTIONS,
  analysisYearOptions,
  describeAnalysisFilters,
  parseAnalysisFilters,
} from "./analysis-filters";

describe("parseAnalysisFilters", () => {
  const fixedNow = new Date("2026-04-25T00:00:00Z");

  it("defaults year to current UTC year and selects all scopes", () => {
    const f = parseAnalysisFilters({}, fixedNow);
    expect(f.year).toBe(2026);
    expect(f.priorYear).toBe(2025);
    expect(f.yoy).toBe(false);
    expect(f.siteId).toBeUndefined();
    expect(Array.from(f.scopes).sort()).toEqual(["s1", "s2", "s3", "waste"]);
  });

  it("parses a year string within the supported range", () => {
    const f = parseAnalysisFilters({ year: "2024" }, fixedNow);
    expect(f.year).toBe(2024);
    expect(f.priorYear).toBe(2023);
  });

  it("rejects an out-of-range year by falling back to the default", () => {
    const f = parseAnalysisFilters({ year: "1899" }, fixedNow);
    expect(f.year).toBe(2026);
  });

  it("treats an unparseable year as default", () => {
    const f = parseAnalysisFilters({ year: "not-a-year" }, fixedNow);
    expect(f.year).toBe(2026);
  });

  it("parses comma-separated scopes and ignores junk values", () => {
    const f = parseAnalysisFilters(
      { scopes: "s1, waste , bogus" },
      fixedNow,
    );
    expect(Array.from(f.scopes).sort()).toEqual(["s1", "waste"]);
  });

  it("collapses an empty parsed scope list back to all scopes", () => {
    const f = parseAnalysisFilters({ scopes: "bogus,nothing" }, fixedNow);
    expect(f.scopes.size).toBe(ANALYSIS_SCOPE_OPTIONS.length);
  });

  it("respects yoy='1' but not other strings", () => {
    expect(parseAnalysisFilters({ yoy: "1" }, fixedNow).yoy).toBe(true);
    expect(parseAnalysisFilters({ yoy: "true" }, fixedNow).yoy).toBe(false);
    expect(parseAnalysisFilters({ yoy: null }, fixedNow).yoy).toBe(false);
  });

  it("passes the site id through verbatim", () => {
    const f = parseAnalysisFilters({ site: "site-123" }, fixedNow);
    expect(f.siteId).toBe("site-123");
  });
});

describe("describeAnalysisFilters", () => {
  const sites = [{ id: "site-1", name: "Lisbon plant" }];
  const fixedNow = new Date("2026-04-25T00:00:00Z");

  it("hides the scope list when all scopes are selected", () => {
    const filters = parseAnalysisFilters({}, fixedNow);
    const description = describeAnalysisFilters(filters, { sites });
    expect(description).toBe("Year: 2026");
  });

  it("includes the resolved site name and scope list when filtered down", () => {
    const filters = parseAnalysisFilters(
      { site: "site-1", scopes: "s1,s2", yoy: "1" },
      fixedNow,
    );
    const description = describeAnalysisFilters(filters, { sites });
    expect(description).toContain("Lisbon plant");
    expect(description).toContain("Scopes: Scope 1, Scope 2");
    expect(description).toContain("YoY: on");
  });

  it("surfaces the raw site id when the site is unknown", () => {
    const filters = parseAnalysisFilters({ site: "site-x" }, fixedNow);
    const description = describeAnalysisFilters(filters, { sites });
    expect(description).toContain("Site: site-x");
  });
});

describe("analysisYearOptions", () => {
  it("returns the current year and the four previous years", () => {
    const fixedNow = new Date("2026-04-25T00:00:00Z");
    expect(analysisYearOptions(fixedNow)).toEqual([
      2026, 2025, 2024, 2023, 2022,
    ]);
  });
});
