import { Shell } from "@/components/Shell";
import { resolveAccessRole } from "@/lib/config";
import { needsYesCount, requireDashboardUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardUser();
  const user = session.user!;
  const waiting = await needsYesCount(user.id);
  const role = resolveAccessRole(session.email, true);
  return (
    <Shell businessName={user.businessName || "Your business"} paused={user.paused} needsYes={waiting} isAdmin={role === "admin" || role === "staff"}>
      {children}
    </Shell>
  );
}
