import Link from "next/link";
import { YesQueue } from "@/components/YesQueue";
import { requireDashboardUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function YesPage() {
  const session = await requireDashboardUser();
  const items = await prisma.approval.findMany({
    where: { userId: session.user!.id, status: "pending" },
    include: { agent: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div>
      <p className="br-kicker">Needs your yes</p>
      <h1>Nothing goes live until you tap yes.</h1>
      <p className="muted">
        When the list is clear, you can <Link href="/dashboard/chat">talk to an agent</Link>.
      </p>
      <YesQueue
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          detail: item.detail,
          agent: item.agent.name,
          role: item.agent.role,
        }))}
      />
    </div>
  );
}
