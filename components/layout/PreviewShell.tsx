"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PauseSwitch } from "@/components/PauseSwitch";
import { NavIcon } from "@/components/icons";
import { DetailProvider, DetailSlot } from "@/components/layout/context";

const links = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/team", label: "My team", icon: "team" },
  { href: "/dashboard/yes", label: "Needs your yes", icon: "yes" },
  { href: "/dashboard/chat", label: "Talk to an agent", icon: "chat" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
  { href: "/dashboard/help", label: "Help", icon: "help" },
];

export function PreviewShell({
  businessName,
  paused,
  needsYes,
  isAdmin,
  children,
}: {
  businessName: string;
  paused: boolean;
  needsYes: number;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(max-width: 800px)").matches) setCollapsed(true);
  }, []);

  return (
    <DetailProvider>
      <div className={collapsed ? "preview-shell layout-c is-collapsed" : "preview-shell layout-c"}>
        <aside className="c-rail" aria-label="Dashboard">
          <button className="c-collapse" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand menu" : "Collapse menu"}>
            {collapsed ? "»" : "«"}
          </button>
          <nav>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={pathname === link.href ? "on" : ""} title={link.label}>
                <NavIcon name={link.icon} />
                <span>{link.label}</span>
                {link.href === "/dashboard/yes" && needsYes > 0 ? <em>{needsYes}</em> : null}
              </Link>
            ))}
            {isAdmin ? (
              <Link href="/sup-admin" title="Admin">
                <NavIcon name="help" />
                <span>Admin</span>
              </Link>
            ) : null}
          </nav>
        </aside>
        <div className="br-main c-main">{children}</div>
        <aside className="c-detail" aria-label="Details">
          <DetailSlot
            fallback={
              <div className="detail-fallback">
                <p className="br-kicker">Business</p>
                <strong>{businessName}</strong>
                <p className="muted">{needsYes > 0 ? `${needsYes} waiting for your yes.` : "Nothing is waiting for your yes."}</p>
              </div>
            }
          />
          <div className="c-pause">
            <PauseSwitch key={String(paused)} initial={paused} />
          </div>
        </aside>
      </div>
    </DetailProvider>
  );
}
