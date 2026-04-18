"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export type SignupState = {
  error: string | null;
  fieldErrors: Record<string, string[]>;
};

const signupSchema = z
  .object({
    token: z.string().min(1),
    name: z.string().trim().min(1, "Name is required").max(120),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function signup(
  _prev: SignupState | null,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: null,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { token, name, password } = parsed.data;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { company: { select: { id: true, name: true } } },
  });

  if (!invitation) {
    return { error: "Invite link is invalid.", fieldErrors: {} };
  }
  if (invitation.acceptedAt) {
    return { error: "This invite has already been used.", fieldErrors: {} };
  }
  if (invitation.expiresAt < new Date()) {
    return { error: "This invite has expired.", fieldErrors: {} };
  }

  const email = invitation.email.toLowerCase();

  // Create or find the user, then attach a membership for the invited
  // company. Existing users accepting an invite keep their password.
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: { email, name, passwordHash, role: "MEMBER" },
      select: { id: true },
    });
    userId = created.id;
  }

  await prisma.$transaction([
    prisma.membership.upsert({
      where: {
        userId_companyId: { userId, companyId: invitation.companyId },
      },
      create: {
        userId,
        companyId: invitation.companyId,
        role: invitation.role,
      },
      update: {},
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date(), acceptedByUserId: userId },
    }),
  ]);

  await createSession(userId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
