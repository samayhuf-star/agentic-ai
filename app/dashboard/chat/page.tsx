import Link from "next/link";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatPreview } from "@/components/dashboard/ChatPreview";
import { previewLayout } from "@/lib/dashboard/preview";
import { requireDashboardUser } from "@/lib/guard";
import { publicKeyFor } from "@/lib/ai/keys";
import { prisma } from "@/lib/prisma";
import { attentionMap, teamOrder } from "@/lib/team";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ agent?: string }> }) {
  const session = await requireDashboardUser();
  const { agent: requested } = await searchParams;
  const userId = session.user!.id;
  const memberships = await prisma.userAgent.findMany({
    where: { userId },
    include: { agent: true },
    orderBy: teamOrder,
  });
  const unknown = Boolean(requested && !memberships.some((row) => row.agentId === requested));
  const active = unknown ? null : memberships.find((row) => row.agentId === requested)?.agentId ?? memberships[0]?.agentId ?? null;
  if (active) {
    await prisma.userAgent.update({
      where: { userId_agentId: { userId, agentId: active } },
      data: { lastReadAt: new Date() },
    });
  }
  const attention = await attentionMap(userId);
  const messages = active
    ? await prisma.message.findMany({
        where: { userId, agentId: active },
        orderBy: { createdAt: "asc" },
        take: 40,
      })
    : [];
  const key = await publicKeyFor(userId);
  const platform = Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY);
  const layout = await previewLayout();

  return (
    <div className="chat-page">
      <p className="br-kicker">Talk to an agent</p>
      <h1>{layout ? "Talk to an agent" : "Plain words. Connect your AI key once."}</h1>
      {memberships.length === 0 ? (
        <p className="muted">
          No agents are on this page yet. <Link href="/dashboard/team">Open my team</Link> or write to{" "}
          <a href="mailto:support@theaitimemachine.com">support@theaitimemachine.com</a>.
        </p>
      ) : unknown ? (
        <p>That teammate isn&apos;t on your team.</p>
      ) : (
        layout ? (
        <ChatPreview
          key={active || "none"}
          activeId={active || memberships[0].agentId}
          hasKey={Boolean(key) || platform}
          agents={memberships.map((row) => ({
            id: row.agentId,
            name: row.agent.name,
            role: row.agent.role,
            color: row.agent.color,
            pinned: row.pinned,
            needsYou: attention.get(row.agentId)?.needsYou || false,
            needsCount: attention.get(row.agentId)?.count || 0,
          }))}
          initial={messages.map((message) => ({ id: message.id, role: message.role, body: message.body }))}
        />
        ) : (
        <ChatPanel
          key={active || "none"}
          activeId={active || memberships[0].agentId}
          hasKey={Boolean(key) || platform}
          agents={memberships.map((row) => ({
            id: row.agentId,
            name: row.agent.name,
            role: row.agent.role,
            color: row.agent.color,
            pinned: row.pinned,
            needsYou: attention.get(row.agentId)?.needsYou || false,
            needsCount: attention.get(row.agentId)?.count || 0,
          }))}
          initial={messages.map((message) => ({ id: message.id, role: message.role, body: message.body }))}
        />
        )
      )}
    </div>
  );
}
