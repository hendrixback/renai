import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import {
  processResendEvent,
  verifyWebhookSignature,
  type ResendEventPayload,
} from "@/lib/email/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend webhook endpoint. Verifies Svix signatures using
 * RESEND_WEBHOOK_SECRET, dedupes by Svix `svix-id`, persists the
 * event, and (for bounces / complaints) annotates the originating
 * invitation row.
 *
 * Local dev path: when RESEND_WEBHOOK_SECRET is unset we accept the
 * payload as-is so a developer running `ngrok` + the Resend dashboard
 * test event can iterate without configuring a secret. Logs a clear
 * warning so this is never confused for prod behaviour.
 */
export async function POST(request: NextRequest) {
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing Svix headers" },
      { status: 400 },
    );
  }

  // Read the raw body — Svix verifies against the exact bytes Resend
  // sent, so any reformatting (e.g. through .json()) breaks the HMAC.
  const rawBody = await request.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  let payload: ResendEventPayload;

  if (!secret) {
    logger.warn(
      "RESEND_WEBHOOK_SECRET not set — accepting webhook without signature verification (dev only).",
    );
    try {
      payload = JSON.parse(rawBody) as ResendEventPayload;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }
  } else {
    try {
      payload = verifyWebhookSignature(secret, rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      logger.warn("Resend webhook signature verification failed", {
        err: err instanceof Error ? err.message : String(err),
        svixId,
      });
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 400 },
      );
    }
  }

  try {
    const result = await processResendEvent({
      webhookId: svixId,
      payload,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    logger.error("Resend webhook processing threw", err, {
      svixId,
      type: payload.type,
    });
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 },
    );
  }
}
