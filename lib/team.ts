import { agents, isGoal, type GoalId } from "@/data/agents";
import { approvalDetail as approvalCopy } from "@/lib/approval-copy";
import { prisma } from "@/lib/prisma";

function catalogRows() {
  return agents.map((agent, index) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    department: agent.department,
    blurb: agent.blurb,
    color: agent.color,
    goals: agent.goals.join(","),
    sort: index,
  }));
}

async function ensureCatalog() {
  const existing = await prisma.agent.count();
  if (existing >= agents.length) return;
  await prisma.agent.createMany({ data: catalogRows(), skipDuplicates: true });
}

export async function ensureTeam(userId: string) {
  const existing = await prisma.userAgent.count({ where: { userId } });
  if (existing >= agents.length) return;
  await ensureCatalog();
  const catalog = await prisma.agent.findMany({ orderBy: { sort: "asc" } });
  if (catalog.length === 0) return;
  await prisma.userAgent.createMany({
    data: catalog.map((agent) => ({
      userId,
      agentId: agent.id,
      recommended: false,
      enabled: false,
      pinned: false,
      sortOrder: agent.sort,
    })),
    skipDuplicates: true,
  });
}

export async function assembleTeam(userId: string, goal: GoalId, options?: { applyEnabled?: boolean }) {
  await ensureCatalog();
  const catalog = await prisma.agent.findMany({ orderBy: { sort: "asc" } });
  const existing = await prisma.userAgent.findMany({ where: { userId } });
  const applyEnabled = options?.applyEnabled ?? existing.length === 0;
  for (const agent of catalog) {
    const recommended = agent.goals.split(",").includes(goal);
    await prisma.userAgent.upsert({
      where: { userId_agentId: { userId, agentId: agent.id } },
      create: { userId, agentId: agent.id, recommended, enabled: recommended, pinned: false, sortOrder: agent.sort },
      update: { recommended, ...(applyEnabled ? { enabled: recommended } : {}) },
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
        detail: approvalCopy(agent, shop, sells),
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
