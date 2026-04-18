import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";

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
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  return user;
});

/**
 * Returns the signed-in user, their active company, and all companies they
 * belong to. Returns null if not signed in OR the user has no memberships
 * (they can't do anything in-app without a company context).
 *
 * Active company selection: first membership by createdAt. A company switcher
 * later can override via a cookie or session field.
 */
export const getCurrentContext = cache(
  async (): Promise<CurrentContext | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        company: { select: { id: true, slug: true, name: true } },
      },
    });

    if (memberships.length === 0) return null;

    const companies: CurrentCompany[] = memberships.map((m) => ({
      id: m.company.id,
      slug: m.company.slug,
      name: m.company.name,
      role: m.role,
    }));

    return {
      user,
      company: companies[0],
      memberships: companies,
    };
  },
);
