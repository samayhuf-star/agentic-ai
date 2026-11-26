import Link from "next/link";
import { notFound } from "next/navigation";
import { DocBody } from "@/components/agent-types/DocBody";
import { LeadCta } from "@/components/agent-types/LeadCta";
import { JsonLd } from "@/components/marketing/JsonLd";
import { PageShell } from "@/components/marketing/PageShell";
import { composeAgentDoc } from "@/lib/agent-types/compose";
import { agentPage, allAgentPages, categoryName } from "@/lib/agent-types/data";
import { agentDocJsonLd } from "@/lib/agent-types/schema";
import { pageMeta, SITE, siteUrl } from "@/lib/site";
import "../aa.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return allAgentPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = agentPage(slug);
  if (!page) return {};
  const doc = composeAgentDoc(page);
  const shot = doc.blocks.find((b) => b.t === "shot");
  const meta = pageMeta(page.title, page.description, page.path, shot && shot.t === "shot" ? shot.src : undefined);
  return {
    ...meta,
    title: { absolute: `${page.title} | ${SITE.name}` },
    alternates: { canonical: siteUrl(page.path), types: { "text/markdown": siteUrl(`${page.path}.md`) } },
    openGraph: { ...meta.openGraph, type: "article", modifiedTime: doc.updated, publishedTime: doc.updated, authors: [SITE.founder] },
    other: { "article:modified_time": doc.updated },
  };
}

function prettyDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function AgentTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = agentPage(slug);
  if (!page) notFound();
  const doc = composeAgentDoc(page);
  const cat = page.fn.cat;
  const crumbs = [
    { name: "AI agents", path: "/ai-agents" },
    { name: `${categoryName(cat)} agents`, path: `/ai-agents/category/${cat}` },
    ...(page.ind ? [{ name: page.fn.name.replace(/^AI /, "AI ").replace(/^./, (c) => c.toUpperCase()), path: `/ai-agents/${page.fn.slug}` }] : []),
    { name: page.ind ? page.ind.name : page.fn.name.replace(/^./, (c) => c.toUpperCase()), path: page.path },
  ];
  const toc = doc.blocks.filter((b) => b.t === "h2") as { t: "h2"; id: string; text: string }[];
  const minutes = Math.max(4, Math.round(doc.wordCount / 230));
  return (
    <PageShell crumbs={crumbs}>
      <JsonLd data={agentDocJsonLd(doc)} />
      <article className="aa-article">
        <p className="mk-kicker">
          {categoryName(cat)} agent{page.ind ? ` · ${page.ind.name}` : ""}
        </p>
        <h1>{doc.h1}</h1>
        <p className="aa-answer">{doc.answer}</p>
        <p className="aa-byline">
          By <Link href="/about">{SITE.founder}</Link>, {SITE.founderRole}, {SITE.name} · Updated <time dateTime={doc.updated}>{prettyDate(doc.updated)}</time> · {minutes} min read ·{" "}
          <a href={`${page.path}.md`} rel="alternate" type="text/markdown">
            Markdown
          </a>
        </p>
        <aside className="aa-facts" aria-labelledby="key-facts">
          <h2 id="key-facts">Key facts</h2>
          <dl>
            {doc.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
        <nav className="aa-toc" aria-label="On this page">
          <p>On this page</p>
          <ol>
            {toc.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
            <li>
              <a href="#get-help">Get help with this agent</a>
            </li>
          </ol>
        </nav>
        <div className="mk-prose aa-prose">
          <DocBody doc={doc} />
        </div>
        {doc.related.length ? (
          <section className="aa-related" aria-labelledby="related-h">
            <h2 id="related-h">Related AI agents</h2>
            <ul>
              {doc.related.map((r) => (
                <li key={r.slug}>
                  <Link href={r.path}>{r.name.replace(/^./, (c) => c.toUpperCase())}</Link>
                </li>
              ))}
            </ul>
            <p>
              Browse all <Link href={`/ai-agents/category/${cat}`}>{categoryName(cat).toLowerCase()} agents</Link> or the full <Link href="/ai-agents">AI agents directory</Link>.
            </p>
          </section>
        ) : null}
        <LeadCta agentName={page.name} pagePath={page.path} heading={`Need ${/^[aeiou]/i.test(page.name) ? "an" : "a"} ${page.name}? Tell us what you need`} />
      </article>
    </PageShell>
  );
}
