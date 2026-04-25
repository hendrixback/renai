import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Throttled write of `User.lastActiveAt` to "now". Called from the app
 * layout on every server render — but we only persist when the stored
 * value is older than the throttle window, so a typical session is
 * one update every few minutes rather than one per page navigation.
 *
 * Failures are logged but never thrown — a missed last-active write is
 * never worth blocking the page render.
 */
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export async function touchUserLastActive(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastActiveAt: true },
    });
    if (!user) return;

    const now = new Date();
    if (
      user.lastActiveAt !== null &&
      now.getTime() - user.lastActiveAt.getTime() < THROTTLE_MS
    ) {
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: now },
    });
  } catch (err) {
    logger.error("Failed to update User.lastActiveAt", err, { userId });
  }
}
