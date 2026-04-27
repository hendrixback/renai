import "server-only";

import { createHash } from "node:crypto";

import type { UIMessage } from "ai";
import { type NextRequest } from "next/server";

import { logActivity } from "@/lib/activity/log-activity";
import { getCurrentContext } from "@/lib/auth";
import { hasRole } from "@/lib/auth/require-role";
import { streamAssistantReply } from "@/lib/ai/client";
import { readAssistantConfig } from "@/lib/ai/config";
import { gatherAssistantContext } from "@/lib/ai/context";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { logger } from "@/lib/logger";
import { checkLimit, limiters } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streaming chat endpoint for the in-app assistant (Spec §19.4).
 *
 * Pre-flight:
 *  - 401 if unauthenticated.
 *  - 403 if user is VIEWER (assistant is for active editors per spec
 *    §19.4 product positioning).
 *  - 503 if the AI provider isn't configured (env vars unset).
 *  - 429 if the per-user hourly cap is exceeded.
 *
 * Body shape: { messages: UIMessage[] } per AI SDK v6 useChat default.
 *
 * Audit: every successful conversation turn writes a single
 * ActivityLog entry with the prompt hash + model. We do NOT persist
 * the prompt text itself (Privacy: keeps GDPR data-minimisation
 * cleaner; Spec Amendment A5 is about *output* content, but inputs
 * deserve the same care).
 */
export async function POST(request: NextRequest) {
  const ctx = await getCurrentContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }
  // VIEWER + above can read; only MEMBER+ can interact with the
  // assistant since it's a workflow tool.
  if (!hasRole(ctx, "MEMBER")) {
    return new Response("Forbidden", { status: 403 });
  }

  const config = readAssistantConfig();
  if (!config) {
    return new Response("AI assistant is not configured.", { status: 503 });
  }

  const limit = checkLimit(limiters.aiChat, ctx.user.id);
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error:
          "Hourly chat limit reached. Try again in a few minutes.",
        retryAfterMs: limit.retryAfterMs,
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": Math.ceil(limit.retryAfterMs / 1000).toString(),
        },
      },
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return new Response("messages[] is required", { status: 400 });
  }
  // Cap conversation length so a runaway client can't push us over
  // the model's context window or burn through free-tier tokens.
  const trimmedMessages = messages.slice(-20);

  const promptCtx = await gatherAssistantContext(ctx);
  const systemPrompt = buildSystemPrompt(promptCtx);

  // Audit: log the turn before streaming starts so we have the entry
  // even if the upstream provider fails mid-stream. Hash the user's
  // last message instead of storing the text.
  const lastUserMessage = [...trimmedMessages]
    .reverse()
    .find((m) => m.role === "user");
  const promptHash = lastUserMessage
    ? hashMessage(lastUserMessage)
    : null;

  await logActivity(ctx, {
    type: "RECORD_CREATED",
    module: "ai-assistant",
    description: `AI chat turn (${config.provider} · ${config.model})`,
    metadata: {
      provider: config.provider,
      model: config.model,
      messageCount: trimmedMessages.length,
      promptHash,
    },
  });

  try {
    const result = await streamAssistantReply({
      config,
      systemPrompt,
      uiMessages: trimmedMessages,
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    logger.error("AI chat stream failed", err, {
      userId: ctx.user.id,
      companyId: ctx.company.id,
      provider: config.provider,
      model: config.model,
    });
    return new Response(
      JSON.stringify({
        error: "The assistant couldn't generate a reply. Try again in a moment.",
      }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      },
    );
  }
}

function hashMessage(msg: UIMessage): string {
  // Best-effort: serialise the message parts and hash. Stable enough
  // for dedup / audit cross-reference.
  const text = JSON.stringify({ role: msg.role, parts: msg.parts ?? [] });
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}
