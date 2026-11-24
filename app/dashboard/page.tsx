import { OverviewPreview } from "@/components/OverviewPreview";
import { goalLabel } from "@/data/agents";
import { requireDashboardUser, startOfTodayIst } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await requireDashboardUser();
  const user = session.user!;
  const [running, waiting, doneToday, recent] = await Promise.all([
    prisma.userAgent.count({ where: { userId: user.id, enabled: true } }),
    prisma.approval.count({ where: { userId: user.id, status: "pending" } }),
    prisma.task.count({ where: { userId: user.id, createdAt: { gte: startOfTodayIst() } } }),
    prisma.task.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const active = user.paused ? 0 : running;
  const goal = user.goal ? goalLabel(user.goal) : "Not set";
  return (
    <OverviewPreview
      businessName={user.businessName?.trim() || "Your business"}
      goal={goal}
      paused={user.paused}
      active={active}
      waiting={waiting}
      doneToday={doneToday}
      recent={recent.map((task) => ({ id: task.id, title: task.title }))}
    />
  );
}
