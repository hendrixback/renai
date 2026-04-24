import { describe, expect, it } from "vitest";

import { formatBytes } from "./bytes";

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1023, "1023 B"],
    [1024, "1.00 KB"],
    [1500, "1.46 KB"],
    [10 * 1024, "10.0 KB"],
    [100 * 1024, "100 KB"],
    [1024 * 1024, "1.00 MB"],
    [5 * 1024 * 1024, "5.00 MB"],
    [50 * 1024 * 1024, "50.0 MB"],
    [1024 * 1024 * 1024, "1.00 GB"],
  ])("formats %d bytes as %s", (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });

  it.each([
    [-1, "—"],
    [Number.NaN, "—"],
    [Number.POSITIVE_INFINITY, "—"],
  ])("returns placeholder for invalid input %p", (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });
});
