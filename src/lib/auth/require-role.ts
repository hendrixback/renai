import "server-only";

import type { CurrentContext } from "@/lib/auth";

/**
 * Role hierarchy.
 *
 * Ordered from least to most privileged. A user with role X is authorised for
 * any action requiring role ≤ X.
 *
 * MEMBER is the schema-level name for what the UI surfaces as "Collaborator"
 * (see ADR/Spec Amendment A9). When the rename migration ships, this map
 * stays backwards-compatible.
 */
const ROLE_LEVEL = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
} as const satisfies Record<CurrentContext["company"]["role"], number>;

export type Role = keyof typeof ROLE_LEVEL;

/**
 * Thrown by `requireRole` when the current context does not meet the required
 * minimum role. Caught by server action error boundaries and turned into a
 * generic "forbidden" response for the client. Do not expose internal
 * role-name details to the UI — that's an information leak.
 */
export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Returns true iff the user's role in the active company is at least `minRole`.
 * Pure check, no side effects. Use in conditional rendering or when you need
 * to decide without throwing.
 */
export function hasRole(ctx: CurrentContext, minRole: Role): boolean {
  return ROLE_LEVEL[ctx.company.role] >= ROLE_LEVEL[minRole];
}

/**
 * Throws `ForbiddenError` if the user's role in the active company is below
 * `minRole`. Call at the top of every mutating server action right after
 * `requireContext()`.
 *
 * @example
 * export async function archiveWasteFlow(id: string) {
 *   const ctx = await requireContext();
 *   requireRole(ctx, "ADMIN"); // only OWNER + ADMIN can archive
 *   // ...
 * }
 */
export function requireRole(ctx: CurrentContext, minRole: Role): void {
  if (!hasRole(ctx, minRole)) {
    throw new ForbiddenError();
  }
}
