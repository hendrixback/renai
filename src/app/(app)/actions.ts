"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clearActiveCompany,
  setActiveCompany,
} from "@/lib/session";

/**
 * Switch the user's active company context. Used both by the sidebar
 * CompanySwitcher (for users with multiple memberships) and by the
 * platform-admin "view as" action.
 */
export async function switchCompany(companyId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  // Regular users: must have a membership in the target company.
  // Platform admins: can switch to any company (impersonation).
  if (user.role !== "ADMIN") {
    const membership = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { id: true },
    });
    if (!membership) return;
  } else {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) return;
  }

  await setActiveCompany(companyId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function exitImpersonation() {
  await clearActiveCompany();
  revalidatePath("/", "layout");
  redirect("/admin");
}
