import Link from "next/link";
import { ChatPanel } from "@/components/ChatPanel";
import { requireDashboardUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ agent?: string }> }) {
  const session = await requireDashboardUser();
  const { agent: requested } = await searchParams;
  const memberships = await prisma.userAgent.findMany({
    where: { userId: session.user!.id },
    include: { agent: true },
    orderBy: { agent: { sort: "asc" } },
  });
  const active = memberships.find((row) => row.agentId === requested)?.agentId ?? memberships[0]?.agentId;
  const messages = active
    ? await prisma.message.findMany({
        where: { userId: session.user!.id, agentId: active },
        orderBy: { createdAt: "asc" },
        take: 40,
      })
    : [];

  return (
    <div className="chat-page">
      <p className="br-kicker">Talk to an agent</p>
      <h1>Plain words. No setup.</h1>
      {memberships.length === 0 ? (
        <p className="muted">
          No agents are on this page yet. <Link href="/dashboard/team">Open my team</Link> or write to{" "}
          <a href="mailto:support@theaitimemachine.com">support@theaitimemachine.com</a>.
        </p>
      ) : (
        <ChatPanel
          activeId={active || memberships[0].agentId}
          agents={memberships.map((row) => ({ id: row.agentId, name: row.agent.name, role: row.agent.role, color: row.agent.color }))}
          initial={messages.map((message) => ({ id: message.id, role: message.role, body: message.body }))}
        />
      )}
    </div>
  );
}
