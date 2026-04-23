"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  readSession,
} from "@/lib/session";

export type LoginState = { error: string | null };

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  from: z.string().optional(),
});

function safeRedirectPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function login(
  _prev: LoginState | null,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    from: formData.get("from") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Email and password are required" };
  }

  const { email, password } = parsed.data;
  const normalisedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalisedEmail },
    select: { id: true, passwordHash: true },
  });

  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    // Failed attempts go through the logger only — we deliberately do not
    // write them to ActivityLog (no company context yet, and surfacing a
    // failed-login count per email is a brute-force information leak).
    // Sentry/Axiom is the correct audit surface for this.
    logger.warn("Login failed", {
      event: "auth.login.failed",
      email: normalisedEmail,
    });
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);
  logger.info("Login succeeded", {
    event: "auth.login.success",
    userId: user.id,
    email: normalisedEmail,
  });

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(parsed.data.from));
}

export async function logout() {
  // Capture userId before destroying the session so the audit log can
  // attribute the event.
  const session = await readSession();
  if (session) {
    logger.info("Logout", {
      event: "auth.logout",
      userId: session.userId,
    });
  }

  await destroySession();
  revalidatePath("/", "layout");
  redirect("/login");
}
