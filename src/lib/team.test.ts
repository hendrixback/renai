import { describe, expect, it } from "vitest";

import { parseTeamFilters } from "./team";

describe("parseTeamFilters", () => {
  it("returns no filters when params are empty", () => {
    expect(parseTeamFilters({})).toEqual({
      role: undefined,
      department: undefined,
      status: undefined,
      search: undefined,
    });
  });

  it("accepts valid role + status values", () => {
    expect(
      parseTeamFilters({ role: "ADMIN", status: "ACTIVE" }),
    ).toMatchObject({ role: "ADMIN", status: "ACTIVE" });
  });

  it("rejects junk role + status values silently", () => {
    expect(
      parseTeamFilters({ role: "GOD", status: "WHATEVER" }),
    ).toMatchObject({ role: undefined, status: undefined });
  });

  it("preserves department + search query", () => {
    expect(
      parseTeamFilters({ department: "Operations", q: "alice" }),
    ).toMatchObject({ department: "Operations", search: "alice" });
  });
});
