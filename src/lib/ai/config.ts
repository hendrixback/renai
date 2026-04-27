import "server-only";

/**
 * AI assistant configuration (Spec §19.4, ADR-011).
 *
 * Provider-agnostic. The Vercel AI SDK's @ai-sdk/openai client speaks
 * the OpenAI Chat Completions wire format, which most modern hosted
 * inference providers also expose:
 *
 *   - OpenAI:     api.openai.com/v1               (paid)
 *   - OpenRouter: openrouter.ai/api/v1            (free models incl. Llama-3.3-70b)
 *   - Groq:       api.groq.com/openai/v1          (free Llama tier)
 *   - Anthropic:  api.anthropic.com/v1            (compat endpoint, paid + free trial)
 *   - Gemini:     generativelanguage.googleapis.com/v1beta/openai
 *   - Ollama:     http://localhost:11434/v1       (local, free, dev only)
 *
 * The user picks via env. When ANY required env is missing we return
 * `null` and the assistant feature is hidden — same pattern as
 * Sentry, no flag, no dead state.
 *
 * Required env vars:
 *   - AI_API_KEY    — provider key (Bearer token).
 *   - AI_MODEL      — model identifier the chosen provider expects.
 *
 * Optional:
 *   - AI_BASE_URL   — defaults to OpenAI public endpoint when unset.
 *   - AI_PROVIDER   — informational label for logs / UI ("openrouter",
 *                     "anthropic", etc.). Doesn't change behaviour.
 *   - AI_MAX_OUTPUT_TOKENS — soft cap for the model response (default
 *                     1024 — keeps free-tier costs predictable).
 */

export type AssistantConfig = {
  apiKey: string;
  model: string;
  baseURL: string | undefined;
  provider: string;
  maxOutputTokens: number;
};

const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

export function readAssistantConfig(): AssistantConfig | null {
  const apiKey = (process.env.AI_API_KEY ?? "").trim();
  const model = (process.env.AI_MODEL ?? "").trim();
  if (!apiKey || !model) return null;

  const baseURL = (process.env.AI_BASE_URL ?? "").trim() || undefined;
  const provider =
    (process.env.AI_PROVIDER ?? "").trim() || guessProvider(baseURL);

  const rawMax = Number(process.env.AI_MAX_OUTPUT_TOKENS);
  const maxOutputTokens =
    Number.isFinite(rawMax) && rawMax > 0 && rawMax <= 8192
      ? Math.floor(rawMax)
      : DEFAULT_MAX_OUTPUT_TOKENS;

  return { apiKey, model, baseURL, provider, maxOutputTokens };
}

function guessProvider(baseURL: string | undefined): string {
  if (!baseURL) return "openai";
  const url = baseURL.toLowerCase();
  if (url.includes("openrouter")) return "openrouter";
  if (url.includes("groq")) return "groq";
  if (url.includes("anthropic")) return "anthropic";
  if (url.includes("googleapis")) return "gemini";
  if (url.includes("localhost") || url.includes("127.0.0.1")) return "ollama";
  return "openai-compat";
}

/**
 * Public, client-safe view of the config — has the provider/model
 * names but never the api key. Used to render a "powered by" footer
 * and decide whether to render the assistant button at all.
 */
export type AssistantPublicConfig = {
  enabled: boolean;
  provider: string | null;
  model: string | null;
};

export function readAssistantPublicConfig(): AssistantPublicConfig {
  const cfg = readAssistantConfig();
  if (!cfg) return { enabled: false, provider: null, model: null };
  return {
    enabled: true,
    provider: cfg.provider,
    model: cfg.model,
  };
}
