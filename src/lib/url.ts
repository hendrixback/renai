/**
 * URL helpers — pure JS, safe in both server and client modules.
 *
 * Kept out of `src/components/export-menu.tsx` (a "use client" file)
 * because Next.js 16 rejects calls from server components into helpers
 * that live behind a `"use client"` boundary.
 */

/**
 * Serialise a Next.js `searchParams` object into the query string the
 * `<ExportMenu>` consumes. Handles single values, arrays, and skips
 * null/undefined entries.
 */
export function serializeSearchParams(
  params: Record<string, string | string[] | null | undefined>,
): string {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => v != null && out.append(key, v));
    } else {
      out.set(key, value);
    }
  }
  return out.toString();
}

/**
 * Returns the absolute origin for outbound URLs (invitation links,
 * task-assigned emails, webhook callbacks, etc.).
 *
 * Resolution order:
 *   1. `PUBLIC_APP_URL` — explicit override, used in staging/prod.
 *   2. `RAILWAY_PUBLIC_DOMAIN_URL` — provided automatically by Railway.
 *   3. In non-production only: `http://localhost:3000`.
 *   4. In production with neither set: throws — better to crash loud at
 *      first send than to ship customers an email full of broken links.
 *
 * Always returns a value with no trailing slash so callers can do
 * `${appOrigin()}/path`.
 */
export function appOrigin(): string {
  const raw = process.env.PUBLIC_APP_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN_URL;
  if (raw && raw.length > 0) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error(
    "appOrigin(): neither PUBLIC_APP_URL nor RAILWAY_PUBLIC_DOMAIN_URL is set in production. Refusing to emit broken-link URLs.",
  );
}
