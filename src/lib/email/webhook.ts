import "server-only";

import { Webhook } from "svix";

import { prisma } from "@/lib/prisma";

// Resend's webhook event payload (subset we actually care about). The
// full schema is documented at https://resend.com/docs/dashboard/webhooks/event-types.
export type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked";

export type ResendEventPayload = {
  type: ResendEventType;
  created_at?: string;
  data: {
    email_id: string;
    from?: string;
    to?: string | string[];
    subject?: string;
    /** Tags arrive as either an array of {name,value} pairs or a flat
     *  object — we normalise to a record before consuming. */
    tags?:
      | Record<string, string>
      | Array<{ name: string; value: string }>;
    bounce?: {
      type?: string;
      subType?: string;
      message?: string;
      diagnosticCode?: string;
    };
    complaint?: {
      type?: string;
      message?: string;
    };
  };
};

const TYPE_MAP: Record<
  ResendEventType,
  | "SENT"
  | "DELIVERED"
  | "DELIVERY_DELAYED"
  | "BOUNCED"
  | "COMPLAINED"
  | null
> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "DELIVERY_DELAYED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
  // Open/click events are intentionally ignored — privacy stance per
  // ADR (no tracking pixels / link rewriting on transactional email).
  "email.opened": null,
  "email.clicked": null,
};

function normaliseTags(
  tags: ResendEventPayload["data"]["tags"],
): Record<string, string> {
  if (!tags) return {};
  if (Array.isArray(tags)) {
    return Object.fromEntries(tags.map((t) => [t.name, t.value]));
  }
  return tags;
}

function recipientFromPayload(
  payload: ResendEventPayload,
): string {
  const to = payload.data.to;
  if (!to) return "";
  return Array.isArray(to) ? to[0] ?? "" : to;
}

/**
 * Verifies the Svix-style HMAC signature on a Resend webhook delivery.
 *
 * @param secret  Resend's RESEND_WEBHOOK_SECRET (starts with `whsec_`).
 * @param body    Raw request body — must be the exact bytes Resend sent.
 * @param headers Headers from the incoming request, must include
 *                svix-id, svix-timestamp, svix-signature.
 *
 * Throws if verification fails. In dev, when no secret is configured,
 * the caller is expected to skip this entirely so the route still
 * processes events from `resend events test` invocations locally.
 */
export function verifyWebhookSignature(
  secret: string,
  body: string,
  headers: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
  },
): ResendEventPayload {
  const wh = new Webhook(secret);
  const verified = wh.verify(body, headers);
  return verified as ResendEventPayload;
}

/**
 * Persists a verified Resend webhook event. The EmailEvent row is the
 * audit trail; the UI joins it on `resendMessageId` to surface bounce
 * status next to pending invitations.
 *
 * Idempotent on `webhookId` — if Resend retries delivery, the second
 * attempt is a no-op thanks to the @unique constraint.
 *
 * Returns whether the event was actually persisted (false = ignored
 * because it's an open/click event we don't track).
 */
export async function processResendEvent(args: {
  webhookId: string;
  payload: ResendEventPayload;
}): Promise<{ persisted: boolean; deduped: boolean }> {
  const { webhookId, payload } = args;
  const mappedType = TYPE_MAP[payload.type];
  if (!mappedType) {
    return { persisted: false, deduped: false };
  }

  const tags = normaliseTags(payload.data.tags);
  const companyId = tags.company_id ?? null;
  const recipient = recipientFromPayload(payload);

  const existing = await prisma.emailEvent.findUnique({
    where: { webhookId },
    select: { id: true },
  });
  if (existing) {
    return { persisted: false, deduped: true };
  }

  await prisma.emailEvent.create({
    data: {
      webhookId,
      resendMessageId: payload.data.email_id,
      type: mappedType,
      emailAddress: recipient,
      bounceType: payload.data.bounce?.type ?? null,
      reason:
        payload.data.bounce?.message ??
        payload.data.bounce?.diagnosticCode ??
        payload.data.complaint?.message ??
        null,
      companyId,
      // Prisma's Json type wants a JSON-serialisable value; round-trip
      // through stringify/parse to drop functions / undefined / bigint.
      rawPayload: JSON.parse(JSON.stringify(payload)),
    },
  });

  return { persisted: true, deduped: false };
}
