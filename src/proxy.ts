import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const PUBLIC_ROUTES = ["/login", "/signup"];
const COOKIE_NAME = "renai_session";

function hasValidSession(raw: string | undefined): boolean {
  if (!raw) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const parts = raw.split(".");
  if (parts.length !== 3) return false;

  const [userId, expiresStr, signature] = parts;
  const payload = `${userId}.${expiresStr}`;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  if (expected.length !== signature.length) return false;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature)))
    return false;

  const expires = Number(expiresStr);
  return Number.isFinite(expires) && expires >= Date.now();
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some((route) => path.startsWith(route));
  const isAuthenticated = hasValidSession(
    request.cookies.get(COOKIE_NAME)?.value,
  );

  if (!isPublic && !isAuthenticated) {
    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(path)}`, request.nextUrl),
    );
  }

  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.ico$).*)",
  ],
};
