import type { Metadata } from "next";
import { SideShell, type SideGroup } from "@/components/console/SideShell";
import { loadPartner, STATUS_TEXT } from "@/lib/affiliates/partner-view";
import "../../sup-admin/admin.css";
import "../../affiliates.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner dashboard · AI Time Machine",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function PartnerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { affiliate, hidden } = await loadPartner(token);
  const base = `/partner/${token}`;
  const items: SideGroup["items"] = [{ href: base, label: "Overview", icon: "home", exact: true }];
  if (!hidden.has("sales")) items.push({ href: `${base}/sales`, label: "Sales & conversions", icon: "funnel" });
  if (!hidden.has("content")) items.push({ href: `${base}/content`, label: "Content analytics", icon: "play" });
  items.push({ href: `${base}/payouts`, label: "Payouts", icon: "wallet" });
  return (
    <div className="adm">
      <SideShell
        groups={[{ items }]}
        brandHref={base}
        brandName="AI Time Machine"
        brandSub="partner"
        storageKey="aitm-partner-sidebar"
        foot={
          <p>
            {affiliate.name}
            <br />
            <span className="muted">
              {affiliate.code} · {STATUS_TEXT[affiliate.status] || affiliate.status}
            </span>
          </p>
        }
      >
        {children}
      </SideShell>
    </div>
  );
}
