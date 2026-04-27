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

/**
 * Known baseURL per provider. When the user sets `AI_PROVIDER` but
 * forgets `AI_BASE_URL`, we infer from this map. Saves one env var
 * and prevents the silent-fallback-to-OpenAI bug that bites when the
 * SDK's default kicks in for non-OpenAI keys.
 */
const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
  openai: undefined, // SDK default
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  anthropic: "https://api.anthropic.com/v1/",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  ollama: "http://localhost:11434/v1",
};

export function readAssistantConfig(): AssistantConfig | null {
  const apiKey = (process.env.AI_API_KEY ?? "").trim();
  const model = (process.env.AI_MODEL ?? "").trim();
  if (!apiKey || !model) return null;

  const explicitBaseURL = (process.env.AI_BASE_URL ?? "").trim() || undefined;
  const explicitProvider = (process.env.AI_PROVIDER ?? "").trim() || undefined;

  // Resolution order:
  //   1. explicit AI_BASE_URL wins (it's the most specific signal)
  //   2. else infer from AI_PROVIDER via the known map
  //   3. else guess from key prefix (sk-or-* → OpenRouter etc.)
  //   4. else fall through to SDK default (OpenAI)
  let baseURL = explicitBaseURL;
  if (!baseURL && explicitProvider) {
    baseURL = PROVIDER_BASE_URLS[explicitProvider.toLowerCase()];
  }
  if (!baseURL) {
    baseURL = inferBaseURLFromKey(apiKey);
  }

  const provider =
    explicitProvider || guessProviderFromBaseURL(baseURL) || guessProviderFromKey(apiKey);

  const rawMax = Number(process.env.AI_MAX_OUTPUT_TOKENS);
  const maxOutputTokens =
    Number.isFinite(rawMax) && rawMax > 0 && rawMax <= 8192
      ? Math.floor(rawMax)
      : DEFAULT_MAX_OUTPUT_TOKENS;

  return { apiKey, model, baseURL, provider, maxOutputTokens };
}

/**
 * Heuristic: API keys carry signature prefixes per provider. Catches
 * the common misconfiguration where a user pastes an OpenRouter key
 * but forgets AI_BASE_URL, causing the SDK to send the request to
 * OpenAI's endpoint and produce a confusing "Incorrect API key" error.
 */
function inferBaseURLFromKey(apiKey: string): string | undefined {
  if (apiKey.startsWith("sk-or-")) return PROVIDER_BASE_URLS.openrouter;
  if (apiKey.startsWith("gsk_")) return PROVIDER_BASE_URLS.groq;
  if (apiKey.startsWith("sk-ant-")) return PROVIDER_BASE_URLS.anthropic;
  return undefined;
}

function guessProviderFromKey(apiKey: string): string {
  if (apiKey.startsWith("sk-or-")) return "openrouter";
  if (apiKey.startsWith("gsk_")) return "groq";
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("AIza")) return "gemini";
  return "openai";
}

function guessProviderFromBaseURL(baseURL: string | undefined): string | undefined {
  if (!baseURL) return undefined;
  const url = baseURL.toLowerCase();
  if (url.includes("openrouter")) return "openrouter";
  if (url.includes("groq")) return "groq";
  if (url.includes("anthropic")) return "anthropic";
  if (url.includes("googleapis")) return "gemini";
  if (url.includes("localhost") || url.includes("127.0.0.1")) return "ollama";
  if (url.includes("openai.com")) return "openai";
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
