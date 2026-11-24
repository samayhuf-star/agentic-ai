import { Shell } from "@/components/Shell";
import { previewLayout } from "@/lib/dashboard/preview";
import { needsYesCount, requireDashboardUser } from "@/lib/guard";
import "../preview-layouts.css";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardUser();
  const user = session.user!;
  const waiting = await needsYesCount(user.id);
  const layout = await previewLayout();
  return (
    <Shell layout={layout} businessName={user.businessName || "Your business"} paused={user.paused} needsYes={waiting} isAdmin={session.isAdmin}>
      {children}
    </Shell>
  );
}
