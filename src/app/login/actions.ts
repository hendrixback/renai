"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";

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
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, passwordHash: true },
  });

  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);
  revalidatePath("/", "layout");
  redirect(safeRedirectPath(parsed.data.from));
}

export async function logout() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/login");
}
