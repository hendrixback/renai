import { NextResponse } from "next/server";

/**
 * Temporary diagnostic — returns whether each email-related env var
 * is *present* (booleans only; values never returned). Helps debug
 * Railway env-var injection without exposing secrets in the response.
 *
 * Remove this route once the integration is confirmed working in
 * prod. It's intentionally unauthenticated because it leaks no
 * secret material — only "is this var set, yes or no".
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const has = (key: string) => {
    const v = process.env[key];
    return typeof v === "string" && v.length > 0;
  };

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
    presence: {
      RESEND_API_KEY: has("RESEND_API_KEY"),
      RESEND_FROM: has("RESEND_FROM"),
      RESEND_WEBHOOK_SECRET: has("RESEND_WEBHOOK_SECRET"),
      PUBLIC_APP_URL: has("PUBLIC_APP_URL"),
      DATABASE_URL: has("DATABASE_URL"),
      SESSION_SECRET: has("SESSION_SECRET"),
    },
    // Char counts only — useful to detect a stray trailing newline
    // or whitespace without revealing the value.
    lengths: {
      RESEND_API_KEY: process.env.RESEND_API_KEY?.length ?? 0,
      RESEND_FROM: process.env.RESEND_FROM?.length ?? 0,
      RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET?.length ?? 0,
    },
    // First 4 chars of the API key (low risk — Resend keys all start
    // with `re_` so this only reveals whether the prefix is intact).
    prefixes: {
      RESEND_API_KEY: process.env.RESEND_API_KEY?.slice(0, 4) ?? null,
    },
  });
}
