"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const ICONS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8",
  card: "M2 6h20v12H2zM2 10h20M6 15h4",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  bot: "M5 9h14v10H5zM12 5v4M9 13h.01M15 13h.01M9 17h6M12 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  pie: "M21 12A9 9 0 1 1 12 3v9zM14 3.3A9 9 0 0 1 20.7 10H14z",
  funnel: "M3 4h18l-7 9v6l-4 2v-8z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10",
  exit: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "M18 6 6 18M6 6l12 12",
  collapse: "M15 18l-6-6 6-6",
  expand: "M9 18l6-6-6-6",
  coins: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  play: "M4 4h16v16H4zM10 8l6 4-6 4z",
  wallet: "M3 7h18v12H3zM3 7l3-4h12l3 4M16 13h2",
} as const;

export type IconName = keyof typeof ICONS;

function Icon({ name }: { name: IconName }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ICONS.list} />
    </svg>
  );
}

export type SideItem = { href: string; label: string; icon: IconName; exact?: boolean; external?: boolean };
export type SideGroup = { title?: string; items: SideItem[] };

export function SideShell({
  groups,
  brandHref,
  brandName,
  brandSub,
  storageKey,
  foot,
  children,
}: {
  groups: SideGroup[];
  brandHref: string;
  brandName: string;
  brandSub: string;
  storageKey: string;
  foot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(storageKey) === "collapsed");
    } catch {
      // storage blocked
    }
  }, [storageKey]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? "collapsed" : "expanded");
      } catch {
        // storage blocked
      }
      return next;
    });
  }, [storageKey]);

  const close = useCallback(() => {
    setOpen(false);
    menuButton.current?.focus();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const matches = (item: SideItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
  const best = groups
    .flatMap((g) => g.items)
    .filter(matches)
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isActive = (item: SideItem) => item.href === best;

  return (
    <div className={`adm-shell${collapsed ? " is-collapsed" : ""}${open ? " is-open" : ""}`}>
      <header className="adm-mobilebar">
        <button ref={menuButton} type="button" className="adm-iconbtn" aria-label="Open menu" aria-expanded={open} aria-controls="adm-sidebar" onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
        <Link href={brandHref} className="adm-brand">
          {brandName} <span>{brandSub}</span>
        </Link>
      </header>
      <div className="adm-scrim" onClick={close} aria-hidden="true" />
      <aside id="adm-sidebar" className="adm-sidebar" aria-label="Admin navigation">
        <div className="adm-side-head">
          <Link href={brandHref} className="adm-brand" title={`${brandName} ${brandSub}`}>
            <span className="adm-logo" aria-hidden="true">
              AI
            </span>
            <span className="adm-label">
              {brandName} <span>{brandSub}</span>
            </span>
          </Link>
          <button ref={closeButton} type="button" className="adm-iconbtn adm-close" aria-label="Close menu" onClick={close}>
            <Icon name="close" />
          </button>
        </div>
        <nav className="adm-side-nav">
          {groups.map((group, index) => (
            <div key={group.title || index} className="adm-group">
              {group.title ? <p className="adm-group-title adm-label">{group.title}</p> : null}
              {group.items.map((item) => {
                const on = isActive(item);
                return (
                  <Link key={item.href} href={item.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined} title={collapsed ? item.label : undefined}>
                    <Icon name={item.icon} />
                    <span className="adm-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="adm-side-foot">
          <div className="adm-who adm-label">{foot}</div>
          <button type="button" className="adm-iconbtn adm-collapse" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand" : "Collapse"}>
            <Icon name={collapsed ? "expand" : "collapse"} />
          </button>
        </div>
      </aside>
      <div className="adm-main">{children}</div>
    </div>
  );
}
