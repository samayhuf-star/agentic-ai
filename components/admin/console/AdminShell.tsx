"use client";

import { SideShell, type SideGroup } from "@/components/console/SideShell";

const GROUPS: SideGroup[] = [
  {
    items: [
      { href: "/sup-admin", label: "Overview", icon: "home", exact: true },
      { href: "/sup-admin/customers", label: "Customers", icon: "users" },
      { href: "/sup-admin/payments", label: "Payments", icon: "card" },
      { href: "/sup-admin/payments/reconcile", label: "Cashfree recon", icon: "shield" },
      { href: "/sup-admin/affiliates", label: "Affiliates", icon: "link" },
      { href: "/sup-admin/creators", label: "Creators", icon: "users" },
      { href: "/sup-admin/agent-leads", label: "AI agents leads", icon: "users" },
      { href: "/sup-admin/agents", label: "Agents", icon: "bot" },
    ],
  },
  {
    title: "Stats",
    items: [
      { href: "/sup-admin/stats", label: "Sales", icon: "chart", exact: true },
      { href: "/sup-admin/stats/orders", label: "Orders", icon: "list" },
      { href: "/sup-admin/stats/customers", label: "Customer stats", icon: "pie" },
      { href: "/sup-admin/stats/funnel", label: "Funnel", icon: "funnel" },
      { href: "/sup-admin/stats/sources", label: "Sources", icon: "pie" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/sup-admin/activity", label: "Activity", icon: "list" },
      { href: "/sup-admin/ops", label: "Operations", icon: "gear" },
      { href: "/sup-admin/audit", label: "Audit log", icon: "shield" },
      { href: "/dashboard", label: "Open the app", icon: "exit" },
    ],
  },
];

export function AdminShell({ email, role, children }: { email: string; role: string; children: React.ReactNode }) {
  return (
    <SideShell
      groups={GROUPS}
      brandHref="/sup-admin"
      brandName="AI Time Machine"
      brandSub="admin"
      storageKey="aitm-admin-sidebar"
      foot={
        <p title={email}>
          {email}
          <br />
          <span className="muted">{role}</span>
        </p>
      }
    >
      {children}
    </SideShell>
  );
}
