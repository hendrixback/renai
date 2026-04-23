import { describe, expect, it } from "vitest";

import type { CurrentContext } from "@/lib/auth";

import {
  ForbiddenError,
  hasRole,
  requireRole,
  type Role,
} from "./require-role";

function ctx(role: CurrentContext["company"]["role"]): CurrentContext {
  return {
    user: { id: "user_1", email: "x@y.z", name: null, role: "MEMBER" },
    company: { id: "co_1", slug: "acme", name: "Acme", role },
    memberships: [],
    isImpersonating: false,
  };
}

describe("hasRole", () => {
  it("returns true when the user's role equals the minimum", () => {
    expect(hasRole(ctx("MEMBER"), "MEMBER")).toBe(true);
  });

  it("returns true when the user's role exceeds the minimum", () => {
    expect(hasRole(ctx("OWNER"), "MEMBER")).toBe(true);
    expect(hasRole(ctx("ADMIN"), "VIEWER")).toBe(true);
  });

  it("returns false when the user's role is below the minimum", () => {
    expect(hasRole(ctx("VIEWER"), "MEMBER")).toBe(false);
    expect(hasRole(ctx("MEMBER"), "ADMIN")).toBe(false);
    expect(hasRole(ctx("ADMIN"), "OWNER")).toBe(false);
  });

  it("respects the full hierarchy VIEWER < MEMBER < ADMIN < OWNER", () => {
    const roles: Role[] = ["VIEWER", "MEMBER", "ADMIN", "OWNER"];
    for (let i = 0; i < roles.length; i++) {
      for (let j = 0; j < roles.length; j++) {
        const result = hasRole(ctx(roles[i]), roles[j]);
        const expected = i >= j;
        expect(
          result,
          `hasRole(${roles[i]}, ${roles[j]}) should be ${expected}`,
        ).toBe(expected);
      }
    }
  });
});

describe("requireRole", () => {
  it("does not throw when the user's role equals the minimum", () => {
    expect(() => requireRole(ctx("MEMBER"), "MEMBER")).not.toThrow();
  });

  it("does not throw when the user's role exceeds the minimum", () => {
    expect(() => requireRole(ctx("OWNER"), "MEMBER")).not.toThrow();
    expect(() => requireRole(ctx("ADMIN"), "VIEWER")).not.toThrow();
  });

  it("throws ForbiddenError when the user's role is below the minimum", () => {
    expect(() => requireRole(ctx("VIEWER"), "MEMBER")).toThrow(ForbiddenError);
    expect(() => requireRole(ctx("MEMBER"), "ADMIN")).toThrow(ForbiddenError);
    expect(() => requireRole(ctx("ADMIN"), "OWNER")).toThrow(ForbiddenError);
  });

  it("uses a generic message that does not leak role details to the UI", () => {
    try {
      requireRole(ctx("VIEWER"), "ADMIN");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      if (err instanceof ForbiddenError) {
        // The generic message is intentional: UI doesn't need to know
        // the exact role required. Detailed logging happens server-side.
        expect(err.message).toBe(
          "You do not have permission to perform this action",
        );
        expect(err.code).toBe("FORBIDDEN");
        expect(err.name).toBe("ForbiddenError");
      }
    }
  });
});

describe("ForbiddenError", () => {
  it("accepts a custom message", () => {
    const err = new ForbiddenError("Custom reason");
    expect(err.message).toBe("Custom reason");
    expect(err.code).toBe("FORBIDDEN");
    expect(err.name).toBe("ForbiddenError");
  });

  it("is an instance of Error (catchable by global handlers)", () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(Error);
  });
});
