import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("flags", () => {
  beforeEach(() => {
    // Reset module registry between tests so each import re-reads env.
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults Scope 3 to disabled when the env var is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_SCOPE3", "");
    const { flags } = await import("./flags");
    expect(flags.scope3Enabled).toBe(false);
  });

  it("enables Scope 3 when the env var is 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_SCOPE3", "true");
    const { flags } = await import("./flags");
    expect(flags.scope3Enabled).toBe(true);
  });

  it("enables Scope 3 when the env var is '1' (numeric form)", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_SCOPE3", "1");
    const { flags } = await import("./flags");
    expect(flags.scope3Enabled).toBe(true);
  });

  it("treats unrecognised values as disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_SCOPE3", "yes");
    const { flags } = await import("./flags");
    expect(flags.scope3Enabled).toBe(false);
  });

  it("documentation is enabled by default (no env var)", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_DOCUMENTATION_DISABLED", "");
    const { flags } = await import("./flags");
    expect(flags.documentationEnabled).toBe(true);
  });

  it("documentation kill-switch disables when the env var is set to 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_DOCUMENTATION_DISABLED", "true");
    const { flags } = await import("./flags");
    expect(flags.documentationEnabled).toBe(false);
  });

  it("exports are immutable (Object.freeze)", async () => {
    const { flags } = await import("./flags");
    expect(() => {
      (flags as unknown as Record<string, boolean>).scope3Enabled = true;
    }).toThrow();
  });
});
