import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { readActiveCompany, readSession } from "@/lib/session";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "MEMBER";
};

export type CurrentCompany = {
  id: string;
  slug: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
};

export type CurrentContext = {
  user: CurrentUser;
  company: CurrentCompany;
  memberships: CurrentCompany[];
  /** True when a platform admin is viewing a company they aren't a member of. */
  isImpersonating: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });
});

/**
 * Returns user + active company + all memberships.
 *
 * Active company resolution:
 *   1. If `renai_active_company` cookie is set and points at a company the
 *      user is a member of → use it.
 *   2. If the cookie points at a company the user is NOT a member of but
 *      the user is a platform admin (`User.role = ADMIN`) → allow it as
 *      impersonation (synthetic OWNER role).
 *   3. Otherwise fall back to the user's first membership.
 *
 * Returns null if the caller has no access to any company context. Platform
 * admins with zero memberships must pick a company in `/admin` first (that
 * sets the cookie), otherwise they should be routed straight to `/admin`.
 */
export const getCurrentContext = cache(
  async (): Promise<CurrentContext | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const [memberships, activeId] = await Promise.all([
      prisma.membership.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          company: { select: { id: true, slug: true, name: true } },
        },
      }),
      readActiveCompany(),
    ]);

    const membershipCompanies: CurrentCompany[] = memberships.map((m) => ({
      id: m.company.id,
      slug: m.company.slug,
      name: m.company.name,
      role: m.role,
    }));

    // 1. Cookie points at a company the user is a member of
    if (activeId) {
      const match = membershipCompanies.find((c) => c.id === activeId);
      if (match) {
        return {
          user,
          company: match,
          memberships: membershipCompanies,
          isImpersonating: false,
        };
      }

      // 2. Platform admin impersonating a company they aren't a member of
      if (user.role === "ADMIN") {
        const company = await prisma.company.findUnique({
          where: { id: activeId },
          select: { id: true, slug: true, name: true },
        });
        if (company) {
          return {
            user,
            company: { ...company, role: "OWNER" },
            memberships: membershipCompanies,
            isImpersonating: true,
          };
        }
      }
    }

    // 3. Fall back to first membership
    if (membershipCompanies.length > 0) {
      return {
        user,
        company: membershipCompanies[0],
        memberships: membershipCompanies,
        isImpersonating: false,
      };
    }

    return null;
  },
);

export function canManageTeam(role: CurrentCompany["role"]): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function isPlatformAdmin(user: CurrentUser | null | undefined): boolean {
  return user?.role === "ADMIN";
}
