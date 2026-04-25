import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("flags", () => {
  beforeEach(() => {
    // Reset module registry between tests so each import re-reads env.
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults regulations to disabled when the env var is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_REGULATIONS", "");
    const { flags } = await import("./flags");
    expect(flags.regulationsEnabled).toBe(false);
  });

  it("enables regulations when the env var is 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_REGULATIONS", "true");
    const { flags } = await import("./flags");
    expect(flags.regulationsEnabled).toBe(true);
  });

  it("enables regulations when the env var is '1' (numeric form)", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_REGULATIONS", "1");
    const { flags } = await import("./flags");
    expect(flags.regulationsEnabled).toBe(true);
  });

  it("treats unrecognised values as disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_REGULATIONS", "yes");
    const { flags } = await import("./flags");
    expect(flags.regulationsEnabled).toBe(false);
  });

  it("exports are immutable (Object.freeze)", async () => {
    const { flags } = await import("./flags");
    expect(() => {
      (flags as unknown as Record<string, boolean>).regulationsEnabled = true;
    }).toThrow();
  });
});
