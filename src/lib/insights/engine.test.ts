import { describe, expect, it } from "vitest";

import { compareInsights, type Insight } from "./types";

const make = (over: Partial<Insight>): Insight => ({
  id: "x",
  severity: "info",
  category: "data-quality",
  title: "x",
  message: "x",
  ...over,
});

describe("compareInsights", () => {
  it("orders critical → warning → info", () => {
    const a = make({ id: "a", severity: "info" });
    const b = make({ id: "b", severity: "critical" });
    const c = make({ id: "c", severity: "warning" });
    const sorted = [a, b, c].sort(compareInsights);
    expect(sorted.map((s) => s.severity)).toEqual([
      "critical",
      "warning",
      "info",
    ]);
  });

  it("breaks ties on id deterministically", () => {
    const a = make({ id: "z", severity: "warning" });
    const b = make({ id: "a", severity: "warning" });
    const sorted = [a, b].sort(compareInsights);
    expect(sorted.map((s) => s.id)).toEqual(["a", "z"]);
  });

  it("combines severity + id (severity wins)", () => {
    const a = make({ id: "z", severity: "critical" });
    const b = make({ id: "a", severity: "warning" });
    const sorted = [a, b].sort(compareInsights);
    expect(sorted.map((s) => s.severity)).toEqual(["critical", "warning"]);
  });
});
