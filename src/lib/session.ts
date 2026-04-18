import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "renai_session";
const ACTIVE_COMPANY_COOKIE = "renai_active_company";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is not set or too short (need 16+ chars)");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function verify(payload: string, signature: string): boolean {
  const expected = sign(payload);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function createSession(userId: string): Promise<void> {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expires}`;
  const token = `${payload}.${sign(payload)}`;

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(ACTIVE_COMPANY_COOKIE);
}

export async function readSession(): Promise<{ userId: string } | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresStr, signature] = parts;

  if (!verify(`${userId}.${expiresStr}`, signature)) return null;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;

  return { userId };
}

// ─── Active company (workspace switcher / admin "view as") ─────────

export async function setActiveCompany(companyId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearActiveCompany(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_COMPANY_COOKIE);
}

export async function readActiveCompany(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_COMPANY_COOKIE)?.value ?? null;
}
