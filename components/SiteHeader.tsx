"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS } from "@/lib/site";

export function SiteHeader({ offer = false }: { offer?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={open ? "nav nav-marketing menu-open" : "nav nav-marketing"}>
      <div className="wrap">
        <Link className="logo" href="/" aria-label="AI Time Machine home">
          <i />
          AI Time Machine
        </Link>
        <button
          className="menu-btn"
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          ☰
        </button>
        <nav className="nav-links" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-cta">
          <Link className="si" href="/login">
            Sign in
          </Link>
          {offer ? (
            <a className="btn btn-p nav-buy" href="/checkout">
              Get ₹1,999 →
            </a>
          ) : (
            <Link className="btn btn-p nav-buy" href="/55-ai-agents">
              See the offer
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
