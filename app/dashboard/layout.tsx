import { Shell } from "@/components/Shell";
import { needsYesCount, requireDashboardUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardUser();
  const user = session.user!;
  const waiting = await needsYesCount(user.id);
  return (
    <Shell businessName={user.businessName || "Your business"} paused={user.paused} needsYes={waiting} isAdmin={session.isAdmin}>
      {children}
    </Shell>
  );
}
