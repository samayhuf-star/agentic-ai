import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, MissingEncryptionKey } from "@/lib/encryption";
import { defaultModel, isListedModel, isProvider, type AiProvider } from "@/lib/ai/models";
import { testProviderKey } from "@/lib/ai/provider";

export type PublicAiKey = {
  provider: AiProvider;
  model: string;
  keyLast4: string;
  isValid: boolean;
  lastTestedAt: string | null;
};

export function toPublicAiKey(row: { provider: string; model: string; keyLast4: string; isValid: boolean; lastTestedAt: Date | null }): PublicAiKey | null {
  if (!isProvider(row.provider)) return null;
  return {
    provider: row.provider,
    model: row.model,
    keyLast4: row.keyLast4,
    isValid: row.isValid,
    lastTestedAt: row.lastTestedAt ? row.lastTestedAt.toISOString() : null,
  };
}

export async function publicKeyFor(userId: string) {
  const row = await prisma.userAiKey.findUnique({ where: { userId } });
  return row ? toPublicAiKey(row) : null;
}

export async function savedKeySecret(userId: string) {
  const row = await prisma.userAiKey.findUnique({ where: { userId } });
  if (!row || !isProvider(row.provider)) return null;
  try {
    return { provider: row.provider, model: row.model, apiKey: decryptSecret(row) };
  } catch {
    return null;
  }
}

export async function testAndMaybeSave(input: { userId: string; provider: string; model: string; apiKey?: string; save: boolean }) {
  if (!isProvider(input.provider)) return { ok: false as const, status: 400, message: "Pick Claude, ChatGPT, or Grok." };
  const model = input.model || defaultModel(input.provider);
  if (!isListedModel(input.provider, model)) return { ok: false as const, status: 400, message: "That model is not available for this key." };
  let apiKey = (input.apiKey || "").trim();
  if (!apiKey) {
    const saved = await savedKeySecret(input.userId);
    if (!saved || saved.provider !== input.provider) return { ok: false as const, status: 400, message: "Paste the key to test it." };
    apiKey = saved.apiKey;
  }
  if (apiKey.length < 8) return { ok: false as const, status: 400, message: "That key was not accepted. Check it and try again." };
  const tested = await testProviderKey(input.provider, model, apiKey);
  if (!input.save) {
    return tested.ok
      ? { ok: true as const, status: 200, key: { provider: input.provider, model, keyLast4: apiKey.slice(-4), isValid: true, lastTestedAt: new Date().toISOString() } }
      : { ok: false as const, status: 400, message: tested.message };
  }
  if (!tested.ok) return { ok: false as const, status: 400, message: tested.message };
  try {
    const sealed = encryptSecret(apiKey);
    const row = await prisma.userAiKey.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        provider: input.provider,
        model,
        ...sealed,
        keyLast4: apiKey.slice(-4),
        isValid: true,
        lastTestedAt: new Date(),
      },
      update: {
        provider: input.provider,
        model,
        ...sealed,
        keyLast4: apiKey.slice(-4),
        isValid: true,
        lastTestedAt: new Date(),
      },
    });
    return { ok: true as const, status: 200, key: toPublicAiKey(row) };
  } catch (error) {
    if (error instanceof MissingEncryptionKey) return { ok: false as const, status: 503, message: error.message };
    console.error("ai key save");
    return { ok: false as const, status: 500, message: "The key could not be saved. Try again." };
  }
}
