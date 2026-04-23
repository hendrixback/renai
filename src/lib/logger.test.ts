import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "./logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    // vi.unstubAllEnvs() restores any env vars stubbed via vi.stubEnv().
    vi.unstubAllEnvs();
  });

  describe("production mode (JSON output)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("emits valid JSON for info", () => {
      logger.info("hello", { requestId: "r_1" });
      expect(logSpy).toHaveBeenCalledTimes(1);
      const out = logSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(out);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("hello");
      expect(parsed.requestId).toBe("r_1");
      expect(typeof parsed.time).toBe("string");
      expect(new Date(parsed.time).toString()).not.toBe("Invalid Date");
    });

    it("routes error-level logs to console.error, not console.log", () => {
      logger.error("boom");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("serialises Error instances into a stable shape", () => {
      const err = new Error("DB unreachable");
      logger.error("query failed", err, { companyId: "co_1" });
      const out = errorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(out);
      expect(parsed.level).toBe("error");
      expect(parsed.message).toBe("query failed");
      expect(parsed.err).toBeDefined();
      expect(parsed.err.name).toBe("Error");
      expect(parsed.err.message).toBe("DB unreachable");
      expect(typeof parsed.err.stack).toBe("string");
      expect(parsed.companyId).toBe("co_1");
    });

    it("handles non-Error values in error()", () => {
      logger.error("string payload", "something went wrong");
      const out = errorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(out);
      expect(parsed.err).toEqual({ value: "something went wrong" });
    });

    it("emits debug and warn levels to console.log", () => {
      logger.debug("d");
      logger.warn("w");
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(JSON.parse(logSpy.mock.calls[0][0] as string).level).toBe("debug");
      expect(JSON.parse(logSpy.mock.calls[1][0] as string).level).toBe("warn");
    });

    it("does not include an err key when error() is called without an error", () => {
      logger.error("just a message");
      const out = errorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(out);
      expect(parsed).not.toHaveProperty("err");
    });

    it("does not crash on circular context (best-effort JSON.stringify)", () => {
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;
      // JSON.stringify on a circular object throws — ensure logger does not
      // swallow. Current implementation will throw; documented here so if
      // we harden it later, the test updates in lock-step.
      expect(() => logger.info("c", circular)).toThrow(/circular/i);
    });
  });

  describe("development mode (pretty output)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("emits non-JSON human-readable output", () => {
      logger.info("hello", { requestId: "r_1" });
      expect(logSpy).toHaveBeenCalledTimes(1);
      const firstArg = logSpy.mock.calls[0][0] as string;
      // Dev output is coloured ANSI + level prefix, NOT JSON.
      expect(firstArg).toContain("[INFO]");
      expect(() => JSON.parse(firstArg)).toThrow();
    });

    it("routes error-level to console.log in dev (coloured) — not console.error", () => {
      // Design note: dev uses console.log uniformly for consistent terminal
      // flushing. Prod splits to stderr for log-ingestion routing.
      logger.error("boom");
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
