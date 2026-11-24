import { headers } from "next/headers";
import { Shell } from "@/components/Shell";
import { resolveAccessRole } from "@/lib/config";
import { needsYesCount, requireDashboardUser } from "@/lib/guard";
import { PREVIEW_LAYOUT_HEADER, parsePreviewLayout } from "@/lib/preview-layout";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDashboardUser();
  const user = session.user!;
  const waiting = await needsYesCount(user.id);
  const role = resolveAccessRole(session.email, true);
  const layout = parsePreviewLayout((await headers()).get(PREVIEW_LAYOUT_HEADER));
  return (
    <Shell businessName={user.businessName || "Your business"} paused={user.paused} needsYes={waiting} isAdmin={role === "admin" || role === "staff"} layout={layout}>
      {children}
    </Shell>
  );
}
