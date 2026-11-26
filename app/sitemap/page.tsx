import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { publicPages } from "@/lib/public-pages";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Sitemap", "A full list of public pages on theaitimemachine.com.", "/sitemap");

const groups: { title: string; test: (path: string) => boolean }[] = [
  { title: "Product", test: (p) => ["/", "/55-ai-agents", "/us", "/us/55-ai-agents", "/agents", "/pricing", "/integrations", "/security", "/status"].includes(p) || p.startsWith("/agents/") },
  { title: "Solutions and use cases", test: (p) => p.startsWith("/solutions") || p.startsWith("/use-cases") },
  { title: "Resources", test: (p) => p.startsWith("/blog") || p.startsWith("/help") || p.startsWith("/partners") || p === "/press" || p === "/sitemap" },
  { title: "Company and legal", test: (p) => ["/about", "/careers", "/contact", "/legal", "/acceptable-use", "/privacy-rights", "/privacy", "/terms", "/refund-policy", "/shipping-policy", "/cookie-policy", "/disclaimer"].includes(p) },
];

export default function HtmlSitemapPage() {
  const pages = publicPages();
  return (
    <PageShell crumbs={[{ name: "Sitemap", path: "/sitemap" }]}>
      <p className="mk-kicker">Sitemap</p>
      <h1>All public pages</h1>
      <p className="mk-lead">A human-readable map of the public site. Machines can also read <a href="/sitemap.xml">sitemap.xml</a>.</p>
      {groups.map((group) => (
        <section key={group.title}>
          <h2>{group.title}</h2>
          <ul className="mk-list">
            {pages.filter(group.test).map((path) => (
              <li key={path}>
                <Link href={path}>{path === "/" ? "Home" : path}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}
