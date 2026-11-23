import { agents, isGoal, type GoalId } from "@/data/agents";
import { prisma } from "@/lib/prisma";

export async function ensureTeam(userId: string) {
  const count = await prisma.userAgent.count({ where: { userId } });
  if (count > 0) return;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const goal: GoalId = user.goal && isGoal(user.goal) ? user.goal : "everything";
  await prisma.user.update({
    where: { id: userId },
    data: {
      goal,
      businessName: user.businessName || "My business",
      sells: user.sells || "everyday work",
      onboardedAt: user.onboardedAt ?? new Date(),
    },
  });
  await assembleTeam(userId, goal);
}

export async function assembleTeam(userId: string, goal: GoalId) {
  const existing = await prisma.agent.count();
  if (existing === 0) {
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
  const catalog = await prisma.agent.findMany({ orderBy: { sort: "asc" } });
  await prisma.userAgent.deleteMany({ where: { userId } });
  await prisma.userAgent.createMany({
    data: catalog.map((agent) => {
      const recommended = agent.goals.split(",").includes(goal);
      return { userId, agentId: agent.id, recommended, enabled: recommended };
    }),
  });
  const recommended = catalog.filter((agent) => agent.goals.split(",").includes(goal));
  const queue = recommended.filter((agent) => agent.department !== "CEO office").slice(0, 2);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.approval.deleteMany({ where: { userId, status: "pending" } });
  if (user) {
    await prisma.approval.createMany({
      data: queue.map((agent) => ({
        userId,
        agentId: agent.id,
        status: "pending",
        title: `${agent.name} has a starting idea`,
        detail: `${agent.name}, your ${agent.role.toLowerCase()}, can help ${user.businessName} with ${user.sells}. ${agent.blurb} This is only a suggestion. Nothing goes out, and no money is spent, until you tap yes.`,
      })),
    });
  }
  return recommended.map((agent) => ({
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
