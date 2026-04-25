import { beforeEach, describe, expect, it, vi } from "vitest";

const { dispatchEmailMock } = vi.hoisted(() => ({
  dispatchEmailMock: vi.fn(),
}));

vi.mock("./client", () => ({
  dispatchEmail: dispatchEmailMock,
  _resetEmailClientForTests: vi.fn(),
}));

import { sendInvitationEmail } from "./send-invitation";

beforeEach(() => {
  dispatchEmailMock.mockReset();
  dispatchEmailMock.mockResolvedValue({ ok: true, id: "id" });
});

describe("sendInvitationEmail", () => {
  const baseInput = {
    recipientEmail: "alice@example.com",
    companyName: "Maxtil",
    companyId: "co-1",
    inviterName: "João",
    role: "MEMBER",
    inviteUrl: "https://app.renai.pt/signup?token=abc",
    expiresAt: new Date("2026-05-02T00:00:00Z"),
  };

  it("dispatches with subject + recipient + tags", async () => {
    await sendInvitationEmail(baseInput);
    expect(dispatchEmailMock).toHaveBeenCalledTimes(1);
    const call = dispatchEmailMock.mock.calls[0][0];
    expect(call.to).toBe("alice@example.com");
    expect(call.subject).toBe("You've been invited to Maxtil on RenAI");
    expect(call.tags).toEqual([
      { name: "type", value: "invitation" },
      { name: "company", value: "Maxtil" },
      { name: "company_id", value: "co-1" },
    ]);
  });

  it("renders both html and a plain-text alternative", async () => {
    await sendInvitationEmail(baseInput);
    const call = dispatchEmailMock.mock.calls[0][0];
    expect(typeof call.html).toBe("string");
    expect(call.html.length).toBeGreaterThan(0);
    expect(call.html).toContain("Maxtil");
    expect(call.html).toContain("https://app.renai.pt/signup?token=abc");

    expect(typeof call.text).toBe("string");
    expect(call.text).toContain("Maxtil");
    expect(call.text).toContain("https://app.renai.pt/signup?token=abc");
  });

  it("passes the company name through unchanged — sanitisation happens in dispatchEmail", async () => {
    await sendInvitationEmail({
      ...baseInput,
      companyName: "RenAI Demo Co.",
    });
    const call = dispatchEmailMock.mock.calls[0][0];
    const companyTag = call.tags.find(
      (t: { name: string }) => t.name === "company",
    );
    // Tag value is the raw company string at this layer; dispatchEmail
    // is responsible for transforming it to "RenAI_Demo_Co" before
    // calling the Resend API. Asserted in client.test.ts.
    expect(companyTag.value).toBe("RenAI Demo Co.");
  });
});
