"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { checkLimit, limiters } from "@/lib/rate-limit";
import {
  createSession,
  destroySession,
  readSession,
} from "@/lib/session";

async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    // The leftmost entry is the originating client per RFC 7239 / de facto.
    return xff.split(",")[0]?.trim() || "unknown";
  }
  return h.get("x-real-ip") ?? "unknown";
}

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

  const ip = await clientIp();
  const limit = checkLimit(limiters.login, ip);
  if (!limit.allowed) {
    logger.warn("Login rate-limited", {
      event: "auth.login.rate_limited",
      ip,
      retryAfterSec: Math.ceil(limit.retryAfterMs / 1000),
    });
    return {
      error: "Too many login attempts. Please try again in a few minutes.",
    };
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
