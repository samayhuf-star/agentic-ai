import { AI_MODELS, type AiProvider } from "@/lib/ai/models";

const TIMEOUT_MS = 20000;

export function plainProviderError(status: number, body: string) {
  const text = body.toLowerCase();
  if (status === 401 || status === 403 || /invalid api key|authentication|unauthorized|permission/.test(text)) {
    return "That key was not accepted. Check it and try again.";
  }
  if (status === 402 || status === 429 || /credit|billing|quota|insufficient|balance/.test(text)) {
    return "This key has no credit, or the billing is not set up.";
  }
  if (status === 404 || /model/.test(text)) {
    return "That model is not available for this key.";
  }
  if (status === 0 || status >= 500) {
    return "The provider could not be reached. Try again in a moment.";
  }
  return "The provider did not accept that. Check the key and the model.";
}

export async function testProviderKey(provider: AiProvider, model: string, apiKey: string) {
  const known = AI_MODELS[provider].some((item) => item.id === model);
  if (!known) return { ok: false as const, message: "That model is not available for this key." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await callProvider(provider, model, apiKey, controller.signal);
    if (response.ok) return { ok: true as const };
    const body = await response.text().catch(() => "");
    return { ok: false as const, message: plainProviderError(response.status, body) };
  } catch {
    return { ok: false as const, message: "The provider could not be reached. Try again in a moment." };
  } finally {
    clearTimeout(timer);
  }
}

async function callProvider(provider: AiProvider, model: string, apiKey: string, signal: AbortSignal) {
  if (provider === "anthropic") {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
  }
  const url = provider === "xai" ? "https://api.x.ai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const body =
    provider === "xai"
      ? { model, max_completion_tokens: 1, temperature: 0, messages: [{ role: "user", content: "Hi" }] }
      : { model, max_completion_tokens: 1, messages: [{ role: "user", content: "Hi" }] };
  return fetch(url, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
}
