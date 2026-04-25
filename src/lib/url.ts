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
