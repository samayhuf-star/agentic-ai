export const AI_PROVIDERS = ["anthropic", "openai", "xai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiModel = { id: string; label: string; default?: boolean };

export const AI_MODELS: Record<AiProvider, AiModel[]> = {
  anthropic: [
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", default: true },
    { id: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
  ],
  openai: [
    { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", default: true },
    { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
    { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  ],
  xai: [
    { id: "grok-4.7", label: "Grok 4.7", default: true },
    { id: "grok-4.6", label: "Grok 4.6" },
    { id: "grok-4.5", label: "Grok 4.5" },
  ],
};

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  anthropic: "Claude",
  openai: "ChatGPT",
  xai: "Grok",
};

export function keyStatusCopy(provider: AiProvider, keyLast4: string, isValid: boolean) {
  const status = isValid ? "Working" : "Not confirmed";
  return `${PROVIDER_LABEL[provider]}, key ending …${keyLast4}. ${status}.`;
}

export const PROVIDER_HELP: Record<AiProvider, string> = {
  anthropic: "Create a key at console.anthropic.com, then paste it here.",
  openai: "Create a key at platform.openai.com/api-keys, then paste it here.",
  xai: "Create a key at console.x.ai, then paste it here.",
};

export function isProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value);
}

export function defaultModel(provider: AiProvider) {
  return AI_MODELS[provider].find((item) => item.default)?.id || AI_MODELS[provider][0].id;
}

export function isListedModel(provider: AiProvider, model: string) {
  return AI_MODELS[provider].some((item) => item.id === model);
}
