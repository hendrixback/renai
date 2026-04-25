import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  taskFindMany,
  taskGroupBy,
  membershipFindMany,
} = vi.hoisted(() => ({
  taskFindMany: vi.fn(),
  taskGroupBy: vi.fn(),
  membershipFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findMany: taskFindMany, groupBy: taskGroupBy },
    membership: { findMany: membershipFindMany },
  },
}));

import {
  buildTaskWhere,
  getTaskCountsByUser,
  getTaskSummary,
  isOverdue,
  listAssignableMembers,
  parseTaskFilters,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
} from "./tasks";

beforeEach(() => {
  taskFindMany.mockReset();
  taskGroupBy.mockReset();
  membershipFindMany.mockReset();
});

describe("isOverdue", () => {
  const now = new Date("2026-04-25T12:00:00Z");

  it("flags an OPEN task with a past due date", () => {
    const yesterday = new Date("2026-04-24T00:00:00Z");
    expect(isOverdue({ status: "OPEN", dueDate: yesterday }, now)).toBe(true);
  });

  it("flags an IN_PROGRESS task with a past due date", () => {
    const yesterday = new Date("2026-04-24T00:00:00Z");
    expect(
      isOverdue({ status: "IN_PROGRESS", dueDate: yesterday }, now),
    ).toBe(true);
  });

  it("does not flag a BLOCKED task even if past due", () => {
    const yesterday = new Date("2026-04-24T00:00:00Z");
    expect(isOverdue({ status: "BLOCKED", dueDate: yesterday }, now)).toBe(
      false,
    );
  });

  it("does not flag a COMPLETED task ever", () => {
    const yesterday = new Date("2026-04-24T00:00:00Z");
    expect(isOverdue({ status: "COMPLETED", dueDate: yesterday }, now)).toBe(
      false,
    );
  });

  it("does not flag a task without a due date", () => {
    expect(isOverdue({ status: "OPEN", dueDate: null }, now)).toBe(false);
  });

  it("does not flag a task with a future due date", () => {
    const tomorrow = new Date("2026-04-26T00:00:00Z");
    expect(isOverdue({ status: "OPEN", dueDate: tomorrow }, now)).toBe(false);
  });
});

describe("parseTaskFilters", () => {
  it("returns empty filters when nothing is provided", () => {
    const f = parseTaskFilters({}, "user-1");
    expect(f).toEqual({
      status: undefined,
      priority: undefined,
      assignedToId: undefined,
      myTasks: undefined,
      overdueOnly: false,
    });
  });

  it("parses valid status + priority + assignee", () => {
    const f = parseTaskFilters(
      { status: "OPEN", priority: "HIGH", assignedTo: "user-2" },
      "user-1",
    );
    expect(f.status).toBe("OPEN");
    expect(f.priority).toBe("HIGH");
    expect(f.assignedToId).toBe("user-2");
    expect(f.myTasks).toBeUndefined();
  });

  it("ignores junk status / priority values", () => {
    const f = parseTaskFilters(
      { status: "BOGUS", priority: "EXTREME" },
      "user-1",
    );
    expect(f.status).toBeUndefined();
    expect(f.priority).toBeUndefined();
  });

  it("flags myTasks when scope=mine", () => {
    const f = parseTaskFilters({ scope: "mine" }, "user-1");
    expect(f.myTasks).toBe(true);
  });

  it("flags myTasks when assignedTo equals current user", () => {
    const f = parseTaskFilters({ assignedTo: "user-1" }, "user-1");
    expect(f.myTasks).toBe(true);
  });

  it("flags overdueOnly when view=overdue", () => {
    const f = parseTaskFilters({ view: "overdue" }, "user-1");
    expect(f.overdueOnly).toBe(true);
  });
});

describe("buildTaskWhere", () => {
  it("scopes to companyId and excludes deleted by default", () => {
    const where = buildTaskWhere(
      "co-1",
      { overdueOnly: false },
      "user-1",
    );
    expect(where).toEqual({ companyId: "co-1", deletedAt: null });
  });

  it("falls back to currentUserId when myTasks is set without explicit assignee", () => {
    const where = buildTaskWhere(
      "co-1",
      { myTasks: true, overdueOnly: false },
      "user-1",
    );
    expect(where.assignedToId).toBe("user-1");
  });

  it("prefers explicit assignedToId over myTasks", () => {
    const where = buildTaskWhere(
      "co-1",
      { myTasks: true, assignedToId: "user-2", overdueOnly: false },
      "user-1",
    );
    expect(where.assignedToId).toBe("user-2");
  });

  it("includes status + priority filters", () => {
    const where = buildTaskWhere(
      "co-1",
      { status: "OPEN", priority: "HIGH", overdueOnly: false },
      "user-1",
    );
    expect(where.status).toBe("OPEN");
    expect(where.priority).toBe("HIGH");
  });
});

describe("getTaskSummary", () => {
  it("rolls up groupBy counts and overdue count", async () => {
    taskGroupBy.mockResolvedValue([
      { status: "OPEN", _count: { _all: 3 } },
      { status: "IN_PROGRESS", _count: { _all: 2 } },
      { status: "BLOCKED", _count: { _all: 1 } },
      { status: "COMPLETED", _count: { _all: 5 } },
      { status: "CANCELLED", _count: { _all: 0 } },
    ]);
    taskFindMany.mockResolvedValue([{ id: "t1" }, { id: "t2" }]);

    const summary = await getTaskSummary({ companyId: "co-1" });

    expect(summary).toEqual({
      open: 3,
      inProgress: 2,
      blocked: 1,
      completed: 5,
      cancelled: 0,
      overdue: 2,
    });
  });

  it("scopes to a specific assignee when given", async () => {
    taskGroupBy.mockResolvedValue([]);
    taskFindMany.mockResolvedValue([]);
    await getTaskSummary({ companyId: "co-1", assignedToId: "user-9" });

    expect(taskGroupBy.mock.calls[0][0].where.assignedToId).toBe("user-9");
    expect(taskFindMany.mock.calls[0][0].where.assignedToId).toBe("user-9");
  });
});

describe("getTaskCountsByUser", () => {
  it("buckets per-user counts and tags overdue", async () => {
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    taskFindMany.mockResolvedValue([
      { assignedToId: "u1", status: "OPEN", dueDate: past },
      { assignedToId: "u1", status: "OPEN", dueDate: future },
      { assignedToId: "u1", status: "COMPLETED", dueDate: past },
      { assignedToId: "u2", status: "IN_PROGRESS", dueDate: past },
    ]);
    const map = await getTaskCountsByUser("co-1");

    expect(map.get("u1")).toEqual({ open: 2, completed: 1, overdue: 1 });
    expect(map.get("u2")).toEqual({ open: 1, completed: 0, overdue: 1 });
  });

  it("ignores tasks with no assignee", async () => {
    taskFindMany.mockResolvedValue([
      { assignedToId: null, status: "OPEN", dueDate: null },
    ]);
    const map = await getTaskCountsByUser("co-1");
    expect(map.size).toBe(0);
  });
});

describe("listAssignableMembers", () => {
  it("returns membership users excluding viewers", async () => {
    membershipFindMany.mockResolvedValue([
      { user: { id: "u1", name: "Alice", email: "a@x" } },
      { user: { id: "u2", name: null, email: "b@x" } },
    ]);
    const list = await listAssignableMembers("co-1");
    expect(list).toEqual([
      { id: "u1", name: "Alice", email: "a@x" },
      { id: "u2", name: null, email: "b@x" },
    ]);
    const where = membershipFindMany.mock.calls[0][0].where;
    expect(where.role.in).toEqual(["OWNER", "ADMIN", "MEMBER"]);
    expect(where.role.in).not.toContain("VIEWER");
  });
});

describe("enums", () => {
  it("exports the documented status + priority value sets", () => {
    expect(TASK_STATUS_VALUES).toEqual([
      "OPEN",
      "IN_PROGRESS",
      "BLOCKED",
      "COMPLETED",
      "CANCELLED",
    ]);
    expect(TASK_PRIORITY_VALUES).toEqual([
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL",
    ]);
  });
});
