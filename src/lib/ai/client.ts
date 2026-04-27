import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type UIMessage, convertToModelMessages } from "ai";

import type { AssistantConfig } from "./config";

/**
 * Build the streaming chat response from the user's message history
 * + the system prompt.
 *
 * The Vercel AI SDK's `@ai-sdk/openai` client targets the OpenAI Chat
 * Completions wire format; setting `baseURL` retargets it to any
 * compatible provider (OpenRouter, Groq, Anthropic compat endpoint,
 * Gemini compat, local Ollama). The model id format varies per
 * provider — `AI_MODEL` is provider-specific.
 *
 * Caller is expected to have done auth + rate-limit checks already.
 */
export async function streamAssistantReply(args: {
  config: AssistantConfig;
  systemPrompt: string;
  uiMessages: UIMessage[];
}) {
  const provider = createOpenAI({
    apiKey: args.config.apiKey,
    baseURL: args.config.baseURL,
  });

  return streamText({
    model: provider(args.config.model),
    system: args.systemPrompt,
    messages: await convertToModelMessages(args.uiMessages),
    maxOutputTokens: args.config.maxOutputTokens,
    temperature: 0.3,
  });
}
