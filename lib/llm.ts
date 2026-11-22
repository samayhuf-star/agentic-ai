import type { Agent, User } from "@prisma/client";
import { goalLabel } from "@/data/agents";

export function cannedReply(agent: Agent, user: User, text: string) {
  const shop = user.businessName || "your business";
  const sells = user.sells || "what you sell";
  const pause = user.paused
    ? " The whole team is paused, so this stays a note until you turn everyone back on."
    : "";
  const hold = `Nothing goes out, and no money is spent, until you tap yes.${pause}`;
  const heard = text.trim().slice(0, 160);
  if (/pause|stop/i.test(heard)) {
    return `${agent.name} here. I can pause my part of the work. The big Pause everything switch stops the whole team at once. ${hold}`;
  }
  if (/price|rupee|spend|budget|ad\b|invoice|gst/i.test(heard)) {
    return `${agent.name} here. I can draft a change for ${shop}, but I will not spend money or send a bill. ${hold}`;
  }
  if (/post|reel|whatsapp|message|email|reply/i.test(heard)) {
    return `${agent.name} here. I can draft that for ${shop}. It will sit in Needs your yes. I will not send it. ${hold}`;
  }
  return `${agent.name} here, ${agent.role.toLowerCase()}. For ${shop} (${sells}) I would prepare one simple next step, then put it in Needs your yes. ${hold}`;
}

export async function agentReply(agent: Agent, user: User, history: { role: string; body: string }[], text: string) {
  const key = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return cannedReply(agent, user, text);
  const base = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const system = [
    `You are ${agent.name}, the ${agent.role} on the Boardroom team for ${user.businessName || "a small business"}.`,
    `They sell: ${user.sells || "not said yet"}. Their main goal: ${user.goal ? goalLabel(user.goal) : "not said yet"}.`,
    "Use plain everyday words. No technical jargon and no acronyms.",
    "Keep the reply under 120 words.",
    "You never publish, send a message to a customer, or spend money yourself.",
    "If they ask for something that would go out or cost money, say you will put it in Needs your yes.",
    "Do not invent numbers, reviews, or results. If you do not know, say so.",
    user.paused ? "The whole team is paused. Say so, and that nothing will go out until they turn it back on." : "",
  ]
    .filter(Boolean)
    .join(" ");
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          ...history.slice(-12).map((item) => ({ role: item.role === "agent" ? "assistant" : "user", content: item.body })),
          { role: "user", content: text },
        ],
      }),
    });
    if (!response.ok) return cannedReply(agent, user, text);
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || cannedReply(agent, user, text);
  } catch (error) {
    console.error(error);
    return cannedReply(agent, user, text);
  }
}
