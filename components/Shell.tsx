"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { PauseSwitch } from "@/components/PauseSwitch";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/team", label: "My team" },
  { href: "/dashboard/yes", label: "Needs your yes" },
  { href: "/dashboard/chat", label: "Talk to an agent" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/help", label: "Help" },
];

export function Shell({
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
  const [open, setOpen] = useState(false);

  return (
    <div className="br-shell">
      <aside className={open ? "br-side open" : "br-side"}>
        <Link className="logo" href="/dashboard">
          <i />
          AI Time Machine
        </Link>
        <button className="btn btn-g menu-toggle" type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Close menu" : "Menu"}
        </button>
        <nav className="br-nav" aria-label="Dashboard">
          {links.map((link) => {
            const on = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={on ? "on" : ""} onClick={() => setOpen(false)}>
                {link.label}
                {link.href === "/dashboard/yes" && needsYes > 0 ? <span className="br-badge">{needsYes}</span> : null}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link href="/sup-admin" onClick={() => setOpen(false)}>
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="pause-big" style={{ marginTop: "auto" }}>
          <div>
            <b>Pause everything</b>
            <div className="muted">One switch. No posts, no messages, no spending.</div>
          </div>
          <PauseSwitch key={String(paused)} initial={paused} />
        </div>
        <div className="muted" style={{ padding: "8px 6px 0" }}>
          {businessName}
        </div>
      </aside>
      <div className="br-main">{children}</div>
    </div>
  );
}
