import { json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { agentReply } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const body = await readJson(request);
  const agentId = String(body.agentId || "");
  const text = String(body.text || "").trim();
  if (!text || text.length > 2000) return json({ message: "Write a short message." }, 400);
  const membership = await prisma.userAgent.findUnique({
    where: { userId_agentId: { userId: user.id, agentId } },
    include: { agent: true },
  });
  if (!membership) return json({ message: "That teammate isn't on your team." }, 404);
  const history = await prisma.message.findMany({
    where: { userId: user.id, agentId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  const reply = await agentReply(membership.agent, user, history, text);
  if (!reply.ok) return json({ message: reply.message, needsKey: reply.needsKey }, reply.needsKey ? 409 : 502);
  await prisma.message.create({ data: { userId: user.id, agentId, role: "user", body: text } });
  const saved = await prisma.message.create({ data: { userId: user.id, agentId, role: "agent", body: reply.text } });
  return json({ reply: saved.body, agentId });
}
