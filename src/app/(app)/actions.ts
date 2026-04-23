"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext, getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
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
  let isImpersonation = false;
  if (user.role !== "ADMIN") {
    const membership = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { id: true },
    });
    if (!membership) return;
  } else {
    const membership = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { id: true },
    });
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) return;
    isImpersonation = !membership;
  }

  await setActiveCompany(companyId);

  if (isImpersonation) {
    // Platform-admin "view as" audit trail under the target company so
    // the company's Owner can see who from RenAI accessed their data.
    await logActivity(
      { user: { id: user.id }, company: { id: companyId } },
      {
        type: "IMPERSONATION_STARTED",
        module: "admin",
        description: "Platform admin started viewing this company",
        metadata: { platformAdminId: user.id },
      },
    );
  }
  logger.info("Company switched", {
    event: "app.switch_company",
    userId: user.id,
    companyId,
    isImpersonation,
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function exitImpersonation() {
  const ctx = await getCurrentContext();
  if (ctx && ctx.isImpersonating) {
    await logActivity(ctx, {
      type: "IMPERSONATION_ENDED",
      module: "admin",
      description: "Platform admin stopped viewing this company",
      metadata: { platformAdminId: ctx.user.id },
    });
  }

  await clearActiveCompany();
  revalidatePath("/", "layout");
  redirect("/admin");
}
