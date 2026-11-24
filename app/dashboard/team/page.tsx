import Link from "next/link";
import { TeamGrid } from "@/components/TeamGrid";
import { requireDashboardUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { attentionMap, teamOrder } from "@/lib/team";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await requireDashboardUser();
  const userId = session.user!.id;
  const rows = await prisma.userAgent.findMany({
    where: { userId },
    include: { agent: true },
    orderBy: teamOrder,
  });
  const attention = await attentionMap(userId);
  return (
    <div className="team-page">
      <p className="br-kicker">My team</p>
      <h1>55 agents. You choose who is on.</h1>
      <p className="muted">Pinned people stay at the top. Drag a card to change the order in its group.</p>
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
            pinned: row.pinned,
            needsYou: attention.get(row.agentId)?.needsYou || false,
            needsCount: attention.get(row.agentId)?.count || 0,
            needsItems: attention.get(row.agentId)?.items || [],
            sortOrder: row.sortOrder,
          }))}
        />
      )}
    </div>
  );
}
