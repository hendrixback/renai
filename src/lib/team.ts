import "server-only";

import { prisma } from "@/lib/prisma";
import { getTaskCountsByUser } from "@/lib/tasks";
import {
  USER_STATUS_VALUES,
  type UserStatusValue,
} from "@/lib/team-shared";

// Spec §17 — Team Overview. Server-only data layer for the
// /team-overview surface. Builds on top of Membership (one row per
// user × company) and joins User profile fields + Tasks counts.
//
// Pure constants + helpers (status enum, role labels) live in
// `team-shared.ts` so client components can import them.

export type { UserStatusValue } from "@/lib/team-shared";
export { USER_STATUS_OPTIONS, USER_STATUS_VALUES } from "@/lib/team-shared";

const ACTIVE_THRESHOLD_DAYS = 30;

export type TeamMemberRow = {
  membershipId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  name: string | null;
  email: string;
  department: string | null;
  lastActiveAt: Date | null;
  joinedAt: Date;
  status: UserStatusValue;
  taskOpen: number;
  taskCompleted: number;
  taskOverdue: number;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  invitedAt: Date;
  expiresAt: Date;
  invitedByName: string | null;
};

export type TeamOverviewData = {
  members: TeamMemberRow[];
  invitations: PendingInvitation[];
  /** Distinct department labels currently in use — drives a filter dropdown. */
  departments: string[];
};

function deriveStatus(
  lastActiveAt: Date | null,
  now: Date,
): UserStatusValue {
  if (lastActiveAt === null) return "INACTIVE";
  const ageMs = now.getTime() - lastActiveAt.getTime();
  const days = ageMs / 86_400_000;
  return days <= ACTIVE_THRESHOLD_DAYS ? "ACTIVE" : "INACTIVE";
}

export type TeamFilters = {
  role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  department?: string;
  status?: UserStatusValue;
  search?: string;
};

export type TeamSearchParams = {
  role?: string | null;
  department?: string | null;
  status?: string | null;
  q?: string | null;
};

export function parseTeamFilters(params: TeamSearchParams): TeamFilters {
  const role = params.role &&
    ["OWNER", "ADMIN", "MEMBER", "VIEWER"].includes(params.role)
    ? (params.role as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER")
    : undefined;
  const status = params.status &&
    (USER_STATUS_VALUES as readonly string[]).includes(params.status)
    ? (params.status as UserStatusValue)
    : undefined;
  return {
    role,
    department: params.department || undefined,
    status,
    search: params.q || undefined,
  };
}

export async function getTeamOverview(
  companyId: string,
  filters: TeamFilters = {},
): Promise<TeamOverviewData> {
  const [memberships, invitations, taskCounts] = await Promise.all([
    prisma.membership.findMany({
      where: {
        companyId,
        ...(filters.role ? { role: filters.role } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            lastActiveAt: true,
          },
        },
      },
    }),
    prisma.invitation.findMany({
      where: {
        companyId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { name: true } } },
    }),
    getTaskCountsByUser(companyId),
  ]);

  const now = new Date();
  let members: TeamMemberRow[] = memberships.map((m) => {
    const status = deriveStatus(m.user.lastActiveAt, now);
    const counts = taskCounts.get(m.user.id) ?? {
      open: 0,
      completed: 0,
      overdue: 0,
    };
    return {
      membershipId: m.id,
      userId: m.user.id,
      role: m.role,
      name: m.user.name,
      email: m.user.email,
      department: m.user.department,
      lastActiveAt: m.user.lastActiveAt,
      joinedAt: m.createdAt,
      status,
      taskOpen: counts.open,
      taskCompleted: counts.completed,
      taskOverdue: counts.overdue,
    };
  });

  if (filters.department) {
    members = members.filter((m) => m.department === filters.department);
  }
  if (filters.status) {
    members = members.filter((m) => m.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    members = members.filter(
      (m) =>
        m.email.toLowerCase().includes(q) ||
        (m.name?.toLowerCase().includes(q) ?? false) ||
        (m.department?.toLowerCase().includes(q) ?? false),
    );
  }

  const departmentSet = new Set<string>();
  for (const m of memberships) {
    if (m.user.department) departmentSet.add(m.user.department);
  }

  return {
    members,
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      invitedAt: i.createdAt,
      expiresAt: i.expiresAt,
      invitedByName: i.invitedBy?.name ?? null,
    })),
    departments: Array.from(departmentSet).sort(),
  };
}

export type TeamMemberProfile = {
  userId: string;
  name: string | null;
  email: string;
  department: string | null;
  lastActiveAt: Date | null;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: Date;
  status: UserStatusValue;
  taskOpen: number;
  taskCompleted: number;
  taskOverdue: number;
};

export async function getTeamMemberProfile(args: {
  companyId: string;
  userId: string;
}): Promise<TeamMemberProfile | null> {
  const membership = await prisma.membership.findFirst({
    where: { companyId: args.companyId, userId: args.userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          lastActiveAt: true,
        },
      },
    },
  });
  if (!membership) return null;

  const counts = await getTaskCountsByUser(args.companyId);
  const userCounts = counts.get(args.userId) ?? {
    open: 0,
    completed: 0,
    overdue: 0,
  };

  return {
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    department: membership.user.department,
    lastActiveAt: membership.user.lastActiveAt,
    role: membership.role,
    joinedAt: membership.createdAt,
    status: deriveStatus(membership.user.lastActiveAt, new Date()),
    taskOpen: userCounts.open,
    taskCompleted: userCounts.completed,
    taskOverdue: userCounts.overdue,
  };
}

export type RecentActivity = {
  id: string;
  type: string;
  module: string;
  description: string;
  createdAt: Date;
};

export async function getUserRecentActivity(args: {
  companyId: string;
  userId: string;
  limit?: number;
}): Promise<RecentActivity[]> {
  const rows = await prisma.activityLog.findMany({
    where: { companyId: args.companyId, userId: args.userId },
    orderBy: { createdAt: "desc" },
    take: args.limit ?? 12,
    select: {
      id: true,
      activityType: true,
      module: true,
      description: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.activityType,
    module: r.module,
    description: r.description,
    createdAt: r.createdAt,
  }));
}
