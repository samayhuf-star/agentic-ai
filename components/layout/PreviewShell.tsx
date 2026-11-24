"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { PauseSwitch } from "@/components/PauseSwitch";
import { NavIcon } from "@/components/icons";
import { DetailProvider, DetailSlot } from "@/components/layout/context";
import type { PreviewLayout } from "@/lib/preview-layout";

const links = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/team", label: "My team", icon: "team" },
  { href: "/dashboard/yes", label: "Needs your yes", icon: "yes" },
  { href: "/dashboard/chat", label: "Talk to an agent", icon: "chat" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
  { href: "/dashboard/help", label: "Help", icon: "help" },
];

function CommandPalette({
  open,
  needsYes,
  isAdmin,
  onClose,
}: {
  open: boolean;
  needsYes: number;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const rows = links.map((link) => ({ ...link, hint: link.href === "/dashboard/yes" && needsYes > 0 ? String(needsYes) : "" }));
    if (isAdmin) rows.push({ href: "/sup-admin", label: "Admin", icon: "help", hint: "" });
    const needle = query.trim().toLowerCase();
    return needle ? rows.filter((row) => row.label.toLowerCase().includes(needle)) : rows;
  }, [isAdmin, needsYes, query]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="command-layer" role="presentation" onClick={onClose}>
      <div className="command-box" role="dialog" aria-modal="true" aria-label="Jump to a page" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Jump to a page"
          aria-label="Jump to a page"
        />
        <ul>
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={onClose}>
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {item.hint ? <em>{item.hint}</em> : null}
              </Link>
            </li>
          ))}
          {items.length === 0 ? <li className="muted">Nothing matches.</li> : null}
        </ul>
      </div>
    </div>
  );
}

export function PreviewShell({
  layout,
  businessName,
  paused,
  needsYes,
  isAdmin,
  children,
}: {
  layout: PreviewLayout;
  businessName: string;
  paused: boolean;
  needsYes: number;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(max-width: 800px)").matches) setCollapsed(true);
  }, []);

  function navClass(href: string) {
    return pathname === href ? "on" : "";
  }

  const palette = <CommandPalette open={open} needsYes={needsYes} isAdmin={isAdmin} onClose={() => setOpen(false)} />;

  if (layout === "a") {
    return (
      <DetailProvider>
        <div className="preview-shell layout-a">
          <aside className="a-rail" aria-label="Dashboard">
            <Link href="/dashboard" className="a-mark" aria-label="AI Time Machine">
              AT
            </Link>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={navClass(link.href)} aria-label={link.label} title={link.label}>
                <NavIcon name={link.icon} />
                {link.href === "/dashboard/yes" && needsYes > 0 ? <i className="rail-dot">{needsYes}</i> : null}
              </Link>
            ))}
            {isAdmin ? (
              <Link href="/sup-admin" aria-label="Admin" title="Admin">
                <NavIcon name="help" />
              </Link>
            ) : null}
          </aside>
          <div className="a-stage">
            <header className="a-command">
              <button className="a-search" type="button" onClick={() => setOpen(true)}>
                <span>Search or jump</span>
                <kbd>⌘K</kbd>
              </button>
              <span className="a-biz">{businessName}</span>
              <PauseSwitch key={String(paused)} initial={paused} />
            </header>
            <div className="br-main">{children}</div>
          </div>
          {palette}
        </div>
      </DetailProvider>
    );
  }

  if (layout === "b") {
    return (
      <DetailProvider>
        <div className="preview-shell layout-b">
          <header className="b-nav">
            <Link href="/dashboard" className="b-logo">
              AI Time Machine
            </Link>
            <nav aria-label="Dashboard">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className={navClass(link.href)}>
                  {link.label}
                  {link.href === "/dashboard/yes" && needsYes > 0 ? <span className="br-badge">{needsYes}</span> : null}
                </Link>
              ))}
              {isAdmin ? <Link href="/sup-admin">Admin</Link> : null}
            </nav>
            <div className="b-nav-end">
              <span>{businessName}</span>
              <PauseSwitch key={String(paused)} initial={paused} />
            </div>
          </header>
          <div className="br-main">{children}</div>
          {palette}
        </div>
      </DetailProvider>
    );
  }

  return (
    <DetailProvider>
      <div className={collapsed ? "preview-shell layout-c is-collapsed" : "preview-shell layout-c"}>
        <aside className="c-rail" aria-label="Dashboard">
          <button className="c-collapse" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand menu" : "Collapse menu"}>
            {collapsed ? "»" : "«"}
          </button>
          <nav>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={navClass(link.href)} title={link.label}>
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
            <PauseSwitch key={`c-${String(paused)}`} initial={paused} />
          </div>
        </aside>
      </div>
    </DetailProvider>
  );
}
