import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("readAssistantConfig", () => {
  const ENV_KEYS = [
    "AI_API_KEY",
    "AI_MODEL",
    "AI_BASE_URL",
    "AI_PROVIDER",
    "AI_MAX_OUTPUT_TOKENS",
  ];

  beforeEach(() => {
    vi.resetModules();
    for (const k of ENV_KEYS) vi.stubEnv(k, "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when AI_API_KEY is missing", async () => {
    vi.stubEnv("AI_MODEL", "x");
    const { readAssistantConfig } = await import("./config");
    expect(readAssistantConfig()).toBeNull();
  });

  it("returns null when AI_MODEL is missing", async () => {
    vi.stubEnv("AI_API_KEY", "sk-or-v1-x");
    const { readAssistantConfig } = await import("./config");
    expect(readAssistantConfig()).toBeNull();
  });

  it("uses explicit AI_BASE_URL when set", async () => {
    vi.stubEnv("AI_API_KEY", "sk-or-v1-x");
    vi.stubEnv("AI_MODEL", "any-model");
    vi.stubEnv("AI_BASE_URL", "https://example.com/v1");
    const { readAssistantConfig } = await import("./config");
    expect(readAssistantConfig()?.baseURL).toBe("https://example.com/v1");
  });

  it("infers OpenRouter baseURL from AI_PROVIDER alone", async () => {
    vi.stubEnv("AI_API_KEY", "sk-or-v1-x");
    vi.stubEnv("AI_MODEL", "meta-llama/llama-3.3-70b-instruct:free");
    vi.stubEnv("AI_PROVIDER", "openrouter");
    const { readAssistantConfig } = await import("./config");
    expect(readAssistantConfig()?.baseURL).toBe("https://openrouter.ai/api/v1");
  });

  it("infers OpenRouter baseURL from key prefix when nothing else is set", async () => {
    vi.stubEnv("AI_API_KEY", "sk-or-v1-foo");
    vi.stubEnv("AI_MODEL", "any");
    const { readAssistantConfig } = await import("./config");
    const cfg = readAssistantConfig();
    expect(cfg?.baseURL).toBe("https://openrouter.ai/api/v1");
    expect(cfg?.provider).toBe("openrouter");
  });

  it("infers Anthropic from sk-ant- key prefix", async () => {
    vi.stubEnv("AI_API_KEY", "sk-ant-foo");
    vi.stubEnv("AI_MODEL", "claude-haiku-4-5-20251001");
    const { readAssistantConfig } = await import("./config");
    const cfg = readAssistantConfig();
    expect(cfg?.baseURL).toBe("https://api.anthropic.com/v1/");
    expect(cfg?.provider).toBe("anthropic");
  });

  it("falls through to SDK default for plain OpenAI keys", async () => {
    vi.stubEnv("AI_API_KEY", "sk-foo");
    vi.stubEnv("AI_MODEL", "gpt-4o-mini");
    const { readAssistantConfig } = await import("./config");
    const cfg = readAssistantConfig();
    expect(cfg?.baseURL).toBeUndefined();
    expect(cfg?.provider).toBe("openai");
  });

  it("clamps invalid AI_MAX_OUTPUT_TOKENS to default", async () => {
    vi.stubEnv("AI_API_KEY", "sk-or-v1-x");
    vi.stubEnv("AI_MODEL", "x");
    vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "not-a-number");
    const { readAssistantConfig } = await import("./config");
    expect(readAssistantConfig()?.maxOutputTokens).toBe(1024);
  });

  it("respects valid AI_MAX_OUTPUT_TOKENS", async () => {
    vi.stubEnv("AI_API_KEY", "sk-or-v1-x");
    vi.stubEnv("AI_MODEL", "x");
    vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "2048");
    const { readAssistantConfig } = await import("./config");
    expect(readAssistantConfig()?.maxOutputTokens).toBe(2048);
  });
});
