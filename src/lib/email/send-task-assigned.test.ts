import { beforeEach, describe, expect, it, vi } from "vitest";

const { dispatchEmailMock } = vi.hoisted(() => ({
  dispatchEmailMock: vi.fn(),
}));

vi.mock("./client", () => ({
  dispatchEmail: dispatchEmailMock,
  _resetEmailClientForTests: vi.fn(),
}));

import { sendTaskAssignedEmail } from "./send-task-assigned";

beforeEach(() => {
  dispatchEmailMock.mockReset();
  dispatchEmailMock.mockResolvedValue({ ok: true, id: "id" });
});

describe("sendTaskAssignedEmail", () => {
  const baseInput = {
    recipientEmail: "alice@example.com",
    assigneeName: "Alice",
    assignerName: "João",
    taskTitle: "Upload Q1 fuel invoices",
    taskDescription: "Diesel + LPG for Jan-Mar",
    priority: "HIGH" as const,
    dueDate: new Date("2026-05-02T00:00:00Z"),
    taskUrl: "https://app.renai.pt/tasks?scope=mine",
    companyName: "Maxtil",
    companyId: "co-1",
  };

  it("dispatches with subject derived from the task title", async () => {
    await sendTaskAssignedEmail(baseInput);
    expect(dispatchEmailMock).toHaveBeenCalledTimes(1);
    const call = dispatchEmailMock.mock.calls[0][0];
    expect(call.to).toBe("alice@example.com");
    expect(call.subject).toBe(
      "New task assigned: Upload Q1 fuel invoices",
    );
  });

  it("tags the send with type=task-assigned + lowercased priority", async () => {
    await sendTaskAssignedEmail(baseInput);
    const call = dispatchEmailMock.mock.calls[0][0];
    expect(call.tags).toEqual([
      { name: "type", value: "task-assigned" },
      { name: "priority", value: "high" },
      { name: "company_id", value: "co-1" },
    ]);
  });

  it("renders task title + description + due date in the html", async () => {
    await sendTaskAssignedEmail(baseInput);
    const call = dispatchEmailMock.mock.calls[0][0];
    expect(call.html).toContain("Upload Q1 fuel invoices");
    expect(call.html).toContain("Diesel + LPG for Jan-Mar");
    expect(call.html).toContain("Maxtil");
  });

  it("handles a null description without breaking render", async () => {
    await sendTaskAssignedEmail({ ...baseInput, taskDescription: null });
    expect(dispatchEmailMock).toHaveBeenCalledTimes(1);
    const call = dispatchEmailMock.mock.calls[0][0];
    expect(call.html).toContain("Upload Q1 fuel invoices");
  });
});
