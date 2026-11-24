"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PauseSwitch } from "@/components/PauseSwitch";
import type { PreviewLayout } from "@/lib/dashboard/preview";

const links = [
  { href: "/dashboard", label: "Overview", mark: "Ov" },
  { href: "/dashboard/team", label: "My team", mark: "Tm" },
  { href: "/dashboard/yes", label: "Needs your yes", mark: "Yes" },
  { href: "/dashboard/chat", label: "Talk to an agent", mark: "Ch" },
  { href: "/dashboard/settings", label: "Settings", mark: "Set" },
  { href: "/dashboard/help", label: "Help", mark: "He" },
];

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [jump, setJump] = useState(false);
  const [query, setQuery] = useState("");
  const matches = links.filter((link) => link.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setJump(true);
      }
      if (event.key === "Escape") setJump(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setJump(false);
    setQuery("");
    setOpen(false);
    router.push(href);
  }

  const nav = (
    <nav className="br-nav" aria-label="Dashboard">
      {links.map((link) => {
        const on = pathname === link.href;
        return (
          <Link key={link.href} href={link.href} className={on ? "on" : ""} aria-label={link.label} title={link.label} onClick={() => setOpen(false)}>
            <span className="nav-mark" aria-hidden="true">{link.mark}</span>
            <span className="nav-label">{link.label}</span>
            {link.href === "/dashboard/yes" && needsYes > 0 ? <span className="br-badge">{needsYes}</span> : null}
          </Link>
        );
      })}
      {isAdmin ? <Link href="/sup-admin">Admin</Link> : null}
    </nav>
  );

  const jumpBox = jump ? (
    <div className="jump-layer" role="presentation" onClick={() => setJump(false)}>
      <div className="jump-card" role="dialog" aria-label="Jump to a page" onClick={(event) => event.stopPropagation()}>
        <input autoFocus value={query} placeholder="Jump to a page" aria-label="Jump to a page" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) go(matches[0].href); }} />
        {matches.map((link) => (
          <button key={link.href} type="button" onClick={() => go(link.href)}>{link.label}</button>
        ))}
      </div>
    </div>
  ) : null;

  if (layout === "b") {
    return (
      <div className="br-shell theme-b">
        <header className="top-nav">
          <Link className="logo" href="/dashboard"><i />AI Time Machine</Link>
          <button className="btn btn-g menu-toggle" type="button" onClick={() => setOpen((value) => !value)}>{open ? "Close menu" : "Menu"}</button>
          <div className={open ? "top-links open" : "top-links"}>{nav}</div>
          <span className="muted nav-shop">{businessName}</span>
        </header>
        <div className="br-main">{children}</div>
        {jumpBox}
      </div>
    );
  }

  return (
    <div className={layout === "a" ? "br-shell theme-a" : collapsed ? "br-shell theme-c is-collapsed" : "br-shell theme-c"}>
      <aside className={open ? "br-side open" : "br-side"}>
        <Link className="logo" href="/dashboard" aria-label="AI Time Machine"><i />{layout === "c" ? <span>AI Time Machine</span> : null}</Link>
        <button className="btn btn-g menu-toggle" type="button" onClick={() => setOpen((value) => !value)}>{open ? "Close menu" : "Menu"}</button>
        {layout === "c" ? (
          <button className="btn btn-g collapse-rail" type="button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? "Show names" : "Hide names"}</button>
        ) : null}
        {nav}
        <div className="pause-big side-pause">
          <div>
            <b>Pause everything</b>
            <div className="muted">One switch. No posts, no messages, no spending.</div>
          </div>
          <PauseSwitch key={String(paused)} initial={paused} />
        </div>
      </aside>
      <div className="br-main">
        {layout === "a" ? (
          <form className="command-bar" onSubmit={(event) => { event.preventDefault(); setJump(true); }}>
            <button type="button" onClick={() => setJump(true)}>Jump to a page</button>
            <kbd>Ctrl K</kbd>
          </form>
        ) : null}
        {children}
      </div>
      {jumpBox}
    </div>
  );
}
