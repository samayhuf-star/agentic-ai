import Link from "next/link";
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
      <p className="muted">A starting group is on. The rest are here when you want them.</p>
      {rows.length === 0 ? (
        <p className="muted">
          The team did not load. <Link href="/dashboard">Try the overview again</Link> or write to{" "}
          <a href="mailto:support@theaitimemachine.com">support@theaitimemachine.com</a>.
        </p>
      ) : (
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
      )}
    </div>
  );
}
