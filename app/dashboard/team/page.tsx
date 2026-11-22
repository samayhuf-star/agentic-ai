import { TeamGrid } from "@/components/TeamGrid";
import { requireDashboardUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await requireDashboardUser();
  const rows = await prisma.userAgent.findMany({
    where: { userId: session.user!.id },
    include: { agent: true },
    orderBy: { agent: { sort: "asc" } },
  });
  return (
    <div>
      <p className="br-kicker">My team</p>
      <h1>55 agents. You choose who is on.</h1>
      <p className="muted">Ayaan turned on a starting group. The rest are here when you want them.</p>
      <TeamGrid
        paused={session.user!.paused}
        cards={rows.map((row) => ({
          id: row.agentId,
          name: row.agent.name,
          role: row.agent.role,
          department: row.agent.department,
          blurb: row.agent.blurb,
          color: row.agent.color,
          enabled: row.enabled,
          recommended: row.recommended,
        }))}
      />
    </div>
  );
}
