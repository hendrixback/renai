import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique, update } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { touchUserLastActive } from "./touch-last-active";

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
});

describe("touchUserLastActive", () => {
  it("writes lastActiveAt when no value is stored yet", async () => {
    findUnique.mockResolvedValue({ lastActiveAt: null });
    await touchUserLastActive("user-1");
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].where).toEqual({ id: "user-1" });
  });

  it("skips the write when lastActiveAt is within the throttle window", async () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    findUnique.mockResolvedValue({ lastActiveAt: oneMinuteAgo });
    await touchUserLastActive("user-1");
    expect(update).not.toHaveBeenCalled();
  });

  it("writes when lastActiveAt is older than the throttle window", async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
    findUnique.mockResolvedValue({ lastActiveAt: tenMinutesAgo });
    await touchUserLastActive("user-1");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the user record is missing", async () => {
    findUnique.mockResolvedValue(null);
    await touchUserLastActive("ghost");
    expect(update).not.toHaveBeenCalled();
  });

  it("never throws when the DB throws", async () => {
    findUnique.mockRejectedValue(new Error("db down"));
    await expect(touchUserLastActive("user-1")).resolves.toBeUndefined();
  });
});
