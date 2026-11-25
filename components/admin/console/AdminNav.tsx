"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/sup-admin", label: "Overview", exact: true },
  { href: "/sup-admin/customers", label: "Customers" },
  { href: "/sup-admin/payments", label: "Payments" },
  { href: "/sup-admin/agents", label: "Agents" },
  { href: "/sup-admin/stats", label: "Sales stats" },
  { href: "/sup-admin/ops", label: "Operations" },
  { href: "/sup-admin/audit", label: "Audit log" },
];

export function AdminNav({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();
  return (
    <header className="adm-top">
      <div className="adm-top-row">
        <Link href="/sup-admin" className="adm-brand">
          AI Time Machine <span>admin</span>
        </Link>
        <span className="adm-who" title={email}>
          {email} · {role}
        </span>
      </div>
      <nav className="adm-nav" aria-label="Admin">
        {links.map((link) => {
          const on = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
              {link.label}
            </Link>
          );
        })}
        <Link href="/dashboard">App</Link>
      </nav>
    </header>
  );
}
