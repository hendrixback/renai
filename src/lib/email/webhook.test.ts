import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, create } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailEvent: { findUnique, create },
  },
}));

vi.mock("svix", () => ({
  Webhook: class MockWebhook {
    constructor(public readonly secret: string) {}
    verify(body: string) {
      // Test stub: just return parsed JSON if secret happens to be
      // "valid", throw otherwise. The real verifier is library code
      // we don't reimplement in tests.
      if (this.secret !== "valid") {
        throw new Error("Invalid signature");
      }
      return JSON.parse(body);
    }
  },
}));

import {
  processResendEvent,
  verifyWebhookSignature,
  type ResendEventPayload,
} from "./webhook";

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
});

function bouncePayload(): ResendEventPayload {
  return {
    type: "email.bounced",
    data: {
      email_id: "msg_abc",
      to: "alice@example.com",
      tags: { type: "invitation", company_id: "co-1" },
      bounce: { type: "Permanent", message: "user unknown" },
    },
  };
}

describe("processResendEvent", () => {
  it("persists a bounce and returns persisted=true", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "evt-1" });

    const result = await processResendEvent({
      webhookId: "svix-1",
      payload: bouncePayload(),
    });

    expect(result).toEqual({ persisted: true, deduped: false });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data).toMatchObject({
      webhookId: "svix-1",
      resendMessageId: "msg_abc",
      type: "BOUNCED",
      emailAddress: "alice@example.com",
      bounceType: "Permanent",
      reason: "user unknown",
      companyId: "co-1",
    });
  });

  it("dedupes when the same webhookId arrives twice", async () => {
    findUnique.mockResolvedValue({ id: "existing" });

    const result = await processResendEvent({
      webhookId: "svix-1",
      payload: bouncePayload(),
    });

    expect(result).toEqual({ persisted: false, deduped: true });
    expect(create).not.toHaveBeenCalled();
  });

  it("ignores email.opened events without persisting", async () => {
    const result = await processResendEvent({
      webhookId: "svix-2",
      payload: {
        type: "email.opened",
        data: { email_id: "msg_x", to: "x@example.com" },
      },
    });

    expect(result).toEqual({ persisted: false, deduped: false });
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("ignores email.clicked events without persisting", async () => {
    const result = await processResendEvent({
      webhookId: "svix-3",
      payload: {
        type: "email.clicked",
        data: { email_id: "msg_y", to: "y@example.com" },
      },
    });

    expect(result).toEqual({ persisted: false, deduped: false });
    expect(create).not.toHaveBeenCalled();
  });

  it("normalises tag arrays to a record before reading company_id", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "evt-2" });

    await processResendEvent({
      webhookId: "svix-4",
      payload: {
        type: "email.delivered",
        data: {
          email_id: "msg_z",
          to: ["bob@example.com"],
          tags: [
            { name: "type", value: "task-assigned" },
            { name: "company_id", value: "co-7" },
          ],
        },
      },
    });

    expect(create.mock.calls[0][0].data.companyId).toBe("co-7");
    expect(create.mock.calls[0][0].data.type).toBe("DELIVERED");
    expect(create.mock.calls[0][0].data.emailAddress).toBe("bob@example.com");
  });

  it("falls back to diagnosticCode when bounce.message is missing", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "evt-3" });

    await processResendEvent({
      webhookId: "svix-5",
      payload: {
        type: "email.bounced",
        data: {
          email_id: "msg_d",
          to: "d@example.com",
          bounce: { type: "Permanent", diagnosticCode: "550 mailbox full" },
        },
      },
    });

    expect(create.mock.calls[0][0].data.reason).toBe("550 mailbox full");
  });

  it("leaves companyId null when no company_id tag was attached", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "evt-4" });

    await processResendEvent({
      webhookId: "svix-6",
      payload: {
        type: "email.complained",
        data: {
          email_id: "msg_e",
          to: "e@example.com",
          tags: { type: "invitation" }, // missing company_id
          complaint: { message: "marked as spam" },
        },
      },
    });

    expect(create.mock.calls[0][0].data.companyId).toBeNull();
    expect(create.mock.calls[0][0].data.reason).toBe("marked as spam");
  });
});

describe("verifyWebhookSignature", () => {
  const headers = {
    "svix-id": "svix-1",
    "svix-timestamp": "1700000000",
    "svix-signature": "v1,fake",
  };

  it("returns the parsed payload when the secret verifies", () => {
    const payload = bouncePayload();
    const result = verifyWebhookSignature(
      "valid",
      JSON.stringify(payload),
      headers,
    );
    expect(result.type).toBe("email.bounced");
  });

  it("throws when the secret does not match", () => {
    expect(() =>
      verifyWebhookSignature("wrong", JSON.stringify(bouncePayload()), headers),
    ).toThrow();
  });
});
