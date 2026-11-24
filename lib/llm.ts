import type { Agent, User } from "@prisma/client";
import { goalLabel } from "@/data/agents";
import { savedKeySecret } from "@/lib/ai/keys";
import { defaultModel, type AiProvider } from "@/lib/ai/models";
import { plainProviderError } from "@/lib/ai/provider";

export type ChatTurn = { role: string; body: string };

export type ReplyResult =
  | { ok: true; text: string }
  | { ok: false; message: string; needsKey?: boolean };

type ResolvedKey = { provider: AiProvider; apiKey: string; model: string; base?: string };

async function resolveKey(userId: string): Promise<ResolvedKey | null> {
  const own = await savedKeySecret(userId);
  if (own) return { provider: own.provider, apiKey: own.apiKey, model: own.model };
  const platform = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!platform) return null;
  return {
    provider: "openai",
    apiKey: platform,
    model: process.env.LLM_MODEL || defaultModel("openai"),
    base: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
  };
}

function systemPrompt(agent: Agent, user: User) {
  const shop = user.businessName?.trim() || "not set yet";
  const sells = user.sells?.trim() || "not set yet";
  const goal = user.goal ? goalLabel(user.goal) : "not set yet";
  return [
    `You are ${agent.name}, the ${agent.role} in ${agent.department} on the AI Time Machine team.`,
    agent.blurb,
    `You help with: ${agent.goals.replace(/,/g, ", ")}.`,
    `The business is ${shop}. They sell or do: ${sells}. Their main goal: ${goal}.`,
    "Use plain everyday words. No jargon.",
    "Keep the reply under 120 words.",
    "Nothing goes out, and no money is spent, until they say yes.",
    "Do not invent numbers, reviews, rankings, or results. If you do not know, say so.",
    user.paused ? "The whole team is paused. Say so, and that nothing will go out until they turn it back on." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function agentReply(agent: Agent, user: User, history: ChatTurn[], text: string): Promise<ReplyResult> {
  const key = await resolveKey(user.id);
  if (!key) {
    return { ok: false, needsKey: true, message: "Connect your AI key in Settings to start chatting." };
  }
  const messages = [
    ...history.slice(-20).map((item) => ({ role: item.role === "agent" ? "assistant" : "user", content: item.body })),
    { role: "user", content: text },
  ];
  try {
    const response =
      key.provider === "anthropic"
        ? await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-key": key.apiKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
              model: key.model,
              max_tokens: 400,
              system: systemPrompt(agent, user),
              messages,
            }),
          })
        : await fetch(`${(key.base || (key.provider === "xai" ? "https://api.x.ai/v1" : "https://api.openai.com/v1")).replace(/\/$/, "")}/chat/completions`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${key.apiKey}` },
            body: JSON.stringify({
              model: key.model,
              temperature: 0.4,
              messages: [{ role: "system", content: systemPrompt(agent, user) }, ...messages],
            }),
          });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, message: plainProviderError(response.status, body) };
    }
    const data = (await response.json()) as {
      content?: { text?: string }[];
      choices?: { message?: { content?: string } }[];
    };
    const reply = (key.provider === "anthropic" ? data.content?.map((part) => part.text || "").join("").trim() : data.choices?.[0]?.message?.content?.trim()) || "";
    if (!reply) return { ok: false, message: "The provider sent an empty reply. Try again." };
    return { ok: true, text: reply };
  } catch (error) {
    console.error("agent reply", error instanceof Error ? error.name : "error");
    return { ok: false, message: "The provider could not be reached. Try again in a moment." };
  }
}
