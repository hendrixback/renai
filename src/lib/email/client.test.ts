import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock factories run before imports — use vi.hoisted to share state.
const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: sendMock };
    constructor(public readonly apiKey: string) {}
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { _resetEmailClientForTests, dispatchEmail } from "./client";
import { logger } from "@/lib/logger";

beforeEach(() => {
  _resetEmailClientForTests();
  sendMock.mockReset();
  vi.mocked(logger.info).mockReset();
  vi.mocked(logger.warn).mockReset();
  vi.mocked(logger.error).mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dispatchEmail — dev fallback", () => {
  it("logs and returns ok=true when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await dispatchEmail({
      to: "alice@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
    });

    expect(result).toEqual({ ok: true, id: null });
    expect(sendMock).not.toHaveBeenCalled();
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      "[email:dev-fallback] would send",
      expect.objectContaining({
        to: "alice@example.com",
        subject: "Hello",
      }),
    );
  });
});

describe("dispatchEmail — real send", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    _resetEmailClientForTests();
  });

  it("sends through Resend with the default From address", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
    const result = await dispatchEmail({
      to: "alice@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
    });

    expect(result).toEqual({ ok: true, id: "email_123" });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      from: "RenAI <onboarding@resend.dev>",
      to: "alice@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
    });
  });

  it("respects RESEND_FROM override when provided", async () => {
    vi.stubEnv("RESEND_FROM", "RenAI <noreply@renai.pt>");
    _resetEmailClientForTests();
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });

    await dispatchEmail({
      to: "alice@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
    });

    expect(sendMock.mock.calls[0][0].from).toBe("RenAI <noreply@renai.pt>");
  });

  it("returns ok=false and logs when Resend reports an error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "domain not verified" },
    });
    const result = await dispatchEmail({
      to: "alice@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
    });

    expect(result).toEqual({ ok: false, error: "domain not verified" });
    expect(vi.mocked(logger.error)).toHaveBeenCalled();
  });

  it("sanitises tag values that contain Resend-disallowed characters", async () => {
    sendMock.mockResolvedValue({ data: { id: "id" }, error: null });
    await dispatchEmail({
      to: "alice@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
      tags: [
        { name: "type", value: "invitation" },
        { name: "company", value: "RenAI Demo Co." },
        { name: "bad name with spaces!", value: "ok" },
      ],
    });

    const sentTags = sendMock.mock.calls[0][0].tags;
    expect(sentTags).toEqual([
      { name: "type", value: "invitation" },
      { name: "company", value: "RenAI_Demo_Co" },
      { name: "bad_name_with_spaces", value: "ok" },
    ]);
  });

  it("drops the tags array entirely when every entry sanitises to empty", async () => {
    sendMock.mockResolvedValue({ data: { id: "id" }, error: null });
    await dispatchEmail({
      to: "alice@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
      tags: [{ name: "!!!", value: "..." }],
    });

    expect(sendMock.mock.calls[0][0].tags).toBeUndefined();
  });

  it("never throws when the SDK throws", async () => {
    sendMock.mockRejectedValue(new Error("network down"));
    const result = await dispatchEmail({
      to: "alice@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("network down");
    }
  });
});
