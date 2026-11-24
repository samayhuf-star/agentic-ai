import { agents, isGoal, type GoalId } from "@/data/agents";
import { prisma } from "@/lib/prisma";

async function ensureCatalog() {
  const existing = await prisma.agent.count();
  if (existing > 0) return;
  for (const [index, agent] of agents.entries()) {
    await prisma.agent.create({
      data: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        department: agent.department,
        blurb: agent.blurb,
        color: agent.color,
        goals: agent.goals.join(","),
        sort: index,
      },
    });
  }
}

export async function ensureTeam(userId: string) {
  const count = await prisma.userAgent.count({ where: { userId } });
  if (count > 0) return;
  await ensureCatalog();
  const catalog = await prisma.agent.findMany({ orderBy: { sort: "asc" } });
  await prisma.userAgent.createMany({
    data: catalog.map((agent) => ({
      userId,
      agentId: agent.id,
      recommended: false,
      enabled: false,
      pinned: false,
      sortOrder: agent.sort,
    })),
  });
}

export async function assembleTeam(userId: string, goal: GoalId, options?: { applyEnabled?: boolean }) {
  await ensureCatalog();
  const catalog = await prisma.agent.findMany({ orderBy: { sort: "asc" } });
  const existing = await prisma.userAgent.findMany({ where: { userId } });
  const byAgent = new Map(existing.map((row) => [row.agentId, row]));
  const applyEnabled = options?.applyEnabled ?? existing.length === 0;
  for (const agent of catalog) {
    const recommended = agent.goals.split(",").includes(goal);
    const row = byAgent.get(agent.id);
    if (!row) {
      await prisma.userAgent.create({
        data: { userId, agentId: agent.id, recommended, enabled: recommended, pinned: false, sortOrder: agent.sort },
      });
      continue;
    }
    await prisma.userAgent.update({
      where: { id: row.id },
      data: { recommended, ...(applyEnabled ? { enabled: recommended } : {}) },
    });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const pending = await prisma.approval.count({ where: { userId, status: "pending" } });
  if (applyEnabled && pending === 0 && user) {
    const recommended = catalog.filter((agent) => agent.goals.split(",").includes(goal) && agent.department !== "CEO office").slice(0, 2);
    const shop = user.businessName?.trim() || "your business";
    const sells = user.sells?.trim() || "what you do";
    await prisma.approval.createMany({
      data: recommended.map((agent) => ({
        userId,
        agentId: agent.id,
        status: "pending",
        title: "Suggestion to get you started",
        detail: approvalDetail(agent, shop, sells),
      })),
    });
  }
  const turnedOn = catalog.filter((agent) => agent.goals.split(",").includes(goal));
  return turnedOn.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    department: agent.department,
    color: agent.color,
  }));
}

function approvalDetail(agent: { name: string; role: string; blurb: string }, shop: string, sells: string) {
  const body = `${agent.name}, your ${agent.role.toLowerCase()}, can help ${shop} with ${sells}. ${agent.blurb}`;
  if (/nothing goes out/i.test(agent.blurb)) return body;
  return `${body} This is only a suggestion. Nothing goes out, and no money is spent, until you tap yes.`;
}

export function readGoal(value: unknown) {
  return typeof value === "string" && isGoal(value) ? value : null;
}

export const teamOrder = [{ pinned: "desc" as const }, { sortOrder: "asc" as const }, { agent: { sort: "asc" as const } }];

export async function attentionMap(userId: string) {
  const [rows, approvals, messages] = await Promise.all([
    prisma.userAgent.findMany({ where: { userId } }),
    prisma.approval.findMany({ where: { userId, status: "pending" }, select: { agentId: true } }),
    prisma.message.findMany({ where: { userId, role: "agent" }, select: { agentId: true, createdAt: true } }),
  ]);
  const pending = new Map<string, number>();
  for (const item of approvals) {
    pending.set(item.agentId, (pending.get(item.agentId) || 0) + 1);
  }
  const result = new Map<string, { needsYou: boolean; count: number }>();
  for (const row of rows) {
    const waiting = pending.get(row.agentId) || 0;
    const unread = messages.filter((item) => item.agentId === row.agentId && (!row.lastReadAt || item.createdAt > row.lastReadAt)).length;
    const count = waiting + unread;
    result.set(row.agentId, { needsYou: count > 0, count });
  }
  return result;
}
