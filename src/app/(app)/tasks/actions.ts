"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { ForbiddenError, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import {
  TASK_PRIORITY_VALUES,
  TASK_RELATED_MODULES,
  TASK_STATUS_VALUES,
} from "@/lib/tasks";

export type TaskActionState = {
  error: string | null;
  fieldErrors: Record<string, string[]>;
};

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const dateField = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}, z.date().optional());

const baseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
  priority: z.enum(TASK_PRIORITY_VALUES).default("MEDIUM"),
  status: z.enum(TASK_STATUS_VALUES).default("OPEN"),
  assignedToId: z.preprocess(emptyToUndef, z.string().cuid().optional()),
  relatedModule: z.preprocess(emptyToUndef, z.enum(TASK_RELATED_MODULES).optional()),
  relatedRecordId: z.preprocess(emptyToUndef, z.string().max(50).optional()),
  startDate: dateField,
  dueDate: dateField,
  notes: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
});

function flattenIssues(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

async function assertMemberRole(): Promise<
  { ok: true; ctx: Awaited<ReturnType<typeof getCurrentContext>> }
  | { ok: false; state: TaskActionState }
> {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return {
      ok: false,
      state: { error: "Not authenticated", fieldErrors: {} },
    };
  }
  try {
    requireRole(ctx, "MEMBER");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return {
        ok: false,
        state: {
          error: "You don't have permission to manage tasks.",
          fieldErrors: {},
        },
      };
    }
    throw err;
  }
  return { ok: true, ctx };
}

export async function createTask(
  _prev: TaskActionState | null,
  formData: FormData,
): Promise<TaskActionState> {
  const auth = await assertMemberRole();
  if (!auth.ok) return auth.state;
  const ctx = auth.ctx!;

  const raw = Object.fromEntries(formData.entries());
  const parsed = baseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: null, fieldErrors: flattenIssues(parsed.error) };
  }
  const data = parsed.data;

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        companyId: ctx.company.id,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority,
        status: data.status,
        assignedToId: data.assignedToId ?? null,
        assignedById: ctx.user.id,
        relatedModule: data.relatedModule ?? null,
        relatedRecordId: data.relatedRecordId ?? null,
        startDate: data.startDate ?? null,
        dueDate: data.dueDate ?? null,
        notes: data.notes ?? null,
      },
      select: { id: true, title: true, assignedToId: true },
    });

    await logActivity(
      ctx,
      {
        type: "TASK_CREATED",
        module: "tasks",
        recordId: created.id,
        description: `Created task "${created.title}"`,
        metadata: {
          priority: data.priority,
          status: data.status,
          assignedToId: data.assignedToId ?? null,
        },
      },
      tx,
    );

    if (created.assignedToId && created.assignedToId !== ctx.user.id) {
      await logActivity(
        ctx,
        {
          type: "TASK_ASSIGNED",
          module: "tasks",
          recordId: created.id,
          description: `Assigned task "${created.title}"`,
          metadata: { assignedToId: created.assignedToId },
        },
        tx,
      );
    }

    return created;
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (task.assignedToId) {
    // User detail page (will surface tasks); created here even though
    // the page lands in Slice B so we don't have to re-touch this file.
    revalidatePath(`/team-overview/${task.assignedToId}`);
  }

  return { error: null, fieldErrors: {} };
}

const updateSchema = baseSchema.extend({
  id: z.string().cuid(),
});

export async function updateTask(
  _prev: TaskActionState | null,
  formData: FormData,
): Promise<TaskActionState> {
  const auth = await assertMemberRole();
  if (!auth.ok) return auth.state;
  const ctx = auth.ctx!;

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: null, fieldErrors: flattenIssues(parsed.error) };
  }
  const data = parsed.data;

  const existing = await prisma.task.findFirst({
    where: { id: data.id, companyId: ctx.company.id, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      assignedToId: true,
    },
  });
  if (!existing) {
    return { error: "Task not found.", fieldErrors: {} };
  }

  // Collaborator-tier permission check (Spec §18.12): MEMBER can only
  // update tasks assigned to them. ADMIN+ can edit any.
  const isAdminOrOwner =
    ctx.company.role === "ADMIN" || ctx.company.role === "OWNER";
  if (!isAdminOrOwner && existing.assignedToId !== ctx.user.id) {
    return {
      error: "Only the task assignee or an admin can edit this task.",
      fieldErrors: {},
    };
  }

  const statusChanged = data.status !== existing.status;
  const assigneeChanged = (data.assignedToId ?? null) !== existing.assignedToId;
  // Auto-stamp completedAt when transitioning into COMPLETED, clear it
  // when transitioning out — single source of truth in the schema.
  const completedAt =
    data.status === "COMPLETED" && existing.status !== "COMPLETED"
      ? new Date()
      : data.status !== "COMPLETED" && existing.status === "COMPLETED"
        ? null
        : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description ?? null,
        priority: data.priority,
        status: data.status,
        assignedToId: data.assignedToId ?? null,
        relatedModule: data.relatedModule ?? null,
        relatedRecordId: data.relatedRecordId ?? null,
        startDate: data.startDate ?? null,
        dueDate: data.dueDate ?? null,
        notes: data.notes ?? null,
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    });

    await logActivity(
      ctx,
      {
        type: "RECORD_UPDATED",
        module: "tasks",
        recordId: data.id,
        description: `Updated task "${data.title}"`,
      },
      tx,
    );

    if (statusChanged) {
      await logActivity(
        ctx,
        {
          type: "TASK_STATUS_CHANGED",
          module: "tasks",
          recordId: data.id,
          description: `Changed task status from ${existing.status} to ${data.status}`,
          metadata: { from: existing.status, to: data.status },
        },
        tx,
      );
    }
    if (assigneeChanged) {
      await logActivity(
        ctx,
        {
          type: "TASK_ASSIGNED",
          module: "tasks",
          recordId: data.id,
          description: data.assignedToId
            ? `Reassigned task "${data.title}"`
            : `Unassigned task "${data.title}"`,
          metadata: {
            from: existing.assignedToId,
            to: data.assignedToId ?? null,
          },
        },
        tx,
      );
    }
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${data.id}`);
  revalidatePath("/dashboard");
  return { error: null, fieldErrors: {} };
}

const statusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(TASK_STATUS_VALUES),
});

/** Inline status transitions from the list (no full-form re-submit). */
export async function changeTaskStatus(
  formData: FormData,
): Promise<{ error: string | null }> {
  const auth = await assertMemberRole();
  if (!auth.ok) return { error: auth.state.error };
  const ctx = auth.ctx!;

  const parsed = statusSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  const existing = await prisma.task.findFirst({
    where: { id: parsed.data.id, companyId: ctx.company.id, deletedAt: null },
    select: { id: true, title: true, status: true, assignedToId: true },
  });
  if (!existing) return { error: "Task not found." };

  const isAdminOrOwner =
    ctx.company.role === "ADMIN" || ctx.company.role === "OWNER";
  if (!isAdminOrOwner && existing.assignedToId !== ctx.user.id) {
    return { error: "Only the assignee or an admin can change this task." };
  }
  if (existing.status === parsed.data.status) return { error: null };

  const completedAt =
    parsed.data.status === "COMPLETED" ? new Date() : null;

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status, completedAt },
    });
    await logActivity(
      ctx,
      {
        type: "TASK_STATUS_CHANGED",
        module: "tasks",
        recordId: parsed.data.id,
        description: `Changed task status from ${existing.status} to ${parsed.data.status}`,
        metadata: { from: existing.status, to: parsed.data.status },
      },
      tx,
    );
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { error: null };
}

const deleteSchema = z.object({ id: z.string().cuid() });

export async function deleteTask(
  formData: FormData,
): Promise<{ error: string | null }> {
  const auth = await assertMemberRole();
  if (!auth.ok) return { error: auth.state.error };
  const ctx = auth.ctx!;

  // Only ADMIN+ can delete (Spec §18.12).
  if (ctx.company.role !== "OWNER" && ctx.company.role !== "ADMIN") {
    return { error: "Only admins can delete tasks." };
  }

  const parsed = deleteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Invalid input." };

  const existing = await prisma.task.findFirst({
    where: { id: parsed.data.id, companyId: ctx.company.id, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!existing) return { error: "Task not found." };

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: parsed.data.id },
      data: { deletedAt: new Date() },
    });
    await logActivity(
      ctx,
      {
        type: "RECORD_DELETED",
        module: "tasks",
        recordId: parsed.data.id,
        description: `Deleted task "${existing.title}"`,
      },
      tx,
    );
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { error: null };
}
