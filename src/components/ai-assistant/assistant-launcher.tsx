import "server-only";

import { readAssistantPublicConfig } from "@/lib/ai/config";

import { AssistantWidget } from "./assistant-widget";

/**
 * Server component that decides whether to render the floating
 * assistant. Renders `null` when the AI provider env vars are unset
 * — same pattern as Sentry, no flag to manage. Once the user sets
 * AI_API_KEY + AI_MODEL the widget appears on next request.
 */
export function AssistantLauncher() {
  const cfg = readAssistantPublicConfig();
  if (!cfg.enabled || !cfg.provider || !cfg.model) return null;
  return <AssistantWidget provider={cfg.provider} model={cfg.model} />;
}
