import { json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/activity/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const body = await readJson(request);
  const id = String(body.id || "");
  const decision = body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : null;
  if (!decision) return json({ message: "Choose yes or not now." }, 400);
  const approval = await prisma.approval.findFirst({ where: { id, userId: user.id }, include: { agent: true } });
  if (!approval || approval.status !== "pending") return json({ message: "That item is already decided." }, 404);
  await prisma.approval.update({ where: { id }, data: { status: decision, decidedAt: new Date() } });
  if (decision === "approved") {
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        agentId: approval.agentId,
        title: `You said yes: ${approval.title}`,
      },
    });
    await logEvent({
      type: "agent",
      email: user.email,
      phone: user.phone,
      userId: user.id,
      status: "task",
      summary: `Task: ${task.title}`,
      dedupeKey: `agent:task:${task.id}`,
    });
  }
  await logEvent({
    type: "agent",
    email: user.email,
    phone: user.phone,
    userId: user.id,
    status: decision,
    summary: `${decision === "approved" ? "Approved" : "Rejected"}: ${approval.title}`,
    dedupeKey: `agent:approval:${id}:${decision}`,
  });
  const note = user.paused
    ? "Saved. The team is paused, so this stays on hold until you turn everyone back on."
    : decision === "approved"
      ? "Saved. You said yes. Nothing was posted and no money was spent, because outside accounts are not connected yet."
      : "Saved. Nothing was sent.";
  return json({ ok: true, message: note });
}
