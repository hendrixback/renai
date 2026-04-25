import "server-only";

import { Resend } from "resend";

import { logger } from "@/lib/logger";

/**
 * Lazily-constructed Resend client.
 *
 * - In production / when `RESEND_API_KEY` is set → real Resend client.
 * - In dev / tests / when the env var is missing → `null` and the send
 *   functions fall back to logging the email to the console (see
 *   `dispatchEmail`). This keeps every flow that sends email working
 *   end-to-end without requiring a real API key locally.
 *
 * The cached value lives at module scope so we don't reconstruct the
 * client on every send.
 */
let cached: Resend | null | undefined;

function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    logger.warn(
      "RESEND_API_KEY not set — email service running in dev fallback (logs only).",
    );
    cached = null;
    return null;
  }
  cached = new Resend(key);
  return cached;
}

/**
 * The address all transactional email is sent from.
 *
 * We use Resend's `onboarding@resend.dev` domain by default — works
 * immediately without DNS setup. Once the customer-facing domain
 * (e.g. `noreply@renai.pt`) has DKIM/SPF/DMARC verified in Resend,
 * set `RESEND_FROM` in the env to override.
 */
function fromAddress(): string {
  return process.env.RESEND_FROM ?? "RenAI <onboarding@resend.dev>";
}

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text alternative — improves deliverability and accessibility. */
  text?: string;
  /** Set to override the default From for a single send. */
  from?: string;
  /** Optional Reply-To header. */
  replyTo?: string;
  /** Tags surfaced in the Resend dashboard for per-flow analytics.
   *  Names + values are sanitised before being sent to Resend (only
   *  [A-Za-z0-9_-] is allowed by the API), so callers can pass any
   *  human-readable string without escaping it themselves. */
  tags?: Array<{ name: string; value: string }>;
};

/**
 * Resend rejects tag names/values that contain anything outside
 * `[A-Za-z0-9_-]`. Replace disallowed chars with underscore, collapse
 * runs of underscores, trim, cap at 256 chars, and drop the tag if
 * the result is empty so we don't send a junk tag to the API.
 */
function sanitizeTagFragment(raw: string): string | null {
  const cleaned = raw
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 256);
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeTags(
  tags: NonNullable<EmailMessage["tags"]>,
): NonNullable<EmailMessage["tags"]> {
  const out: NonNullable<EmailMessage["tags"]> = [];
  for (const tag of tags) {
    const name = sanitizeTagFragment(tag.name);
    const value = sanitizeTagFragment(tag.value);
    if (name && value) out.push({ name, value });
  }
  return out;
}

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

/**
 * Sends an email via Resend, or logs it to the console in dev fallback
 * mode. Never throws — callers (server actions, log emitters) should
 * not have to wrap each send in a try/catch.
 *
 * Returns a structured result so callers can surface a soft warning
 * if the send failed without aborting the parent operation.
 */
export async function dispatchEmail(message: EmailMessage): Promise<SendResult> {
  const client = getResend();

  if (client === null) {
    logger.info("[email:dev-fallback] would send", {
      to: message.to,
      subject: message.subject,
      tags: message.tags,
    });
    return { ok: true, id: null };
  }

  const safeTags = message.tags ? sanitizeTags(message.tags) : undefined;
  try {
    const result = await client.emails.send({
      from: message.from ?? fromAddress(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
      tags: safeTags && safeTags.length > 0 ? safeTags : undefined,
    });
    if (result.error) {
      logger.error("Resend send failed", result.error, {
        to: message.to,
        subject: message.subject,
      });
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id ?? null };
  } catch (err) {
    logger.error("Resend send threw", err, {
      to: message.to,
      subject: message.subject,
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

/** Test seam — lets unit tests reset the cached client between runs. */
export function _resetEmailClientForTests(): void {
  cached = undefined;
}
