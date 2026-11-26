import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadCta } from "@/components/agent-types/LeadCta";
import { JsonLd } from "@/components/marketing/JsonLd";
import { PageShell } from "@/components/marketing/PageShell";
import { AGENT_TYPES_UPDATED, type CategoryId, categoriesWithPages, FUNCTIONS, pagesInCategory } from "@/lib/agent-types/data";
import { publisherLd } from "@/lib/agent-types/schema";
import { pageMeta, siteUrl } from "@/lib/site";
import "../../aa.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return categoriesWithPages().map((cat) => ({ cat: cat.id }));
}

function findCat(id: string) {
  return categoriesWithPages().find((cat) => cat.id === id) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ cat: string }> }) {
  const { cat: id } = await params;
  const cat = findCat(id);
  if (!cat) return {};
  const title = `${cat.name} AI Agents: Types, Use Cases and Build Guides`;
  const meta = pageMeta(title, `${cat.blurb} Guides with architecture, free repos, platforms, KPIs and risks.`, `/ai-agents/category/${cat.id}`);
  return { ...meta, title: { absolute: `${title} | AI Time Machine` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat: id } = await params;
  const cat = findCat(id);
  if (!cat) notFound();
  const fns = FUNCTIONS.filter((fn) => fn.cat === (cat.id as CategoryId));
  const pages = pagesInCategory(cat.id);
  const url = siteUrl(`/ai-agents/category/${cat.id}`);
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${cat.name} AI agents`,
    url,
    dateModified: AGENT_TYPES_UPDATED,
    publisher: publisherLd(),
    mainEntity: { "@type": "ItemList", numberOfItems: pages.length, itemListElement: pages.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: siteUrl(p.path), name: p.name })) },
  };
  return (
    <PageShell crumbs={[{ name: "AI agents", path: "/ai-agents" }, { name: `${cat.name} agents`, path: `/ai-agents/category/${cat.id}` }]}>
      <JsonLd data={ld} />
      <article className="aa-article">
        <p className="mk-kicker">Category</p>
        <h1>{cat.name} AI agents</h1>
        <p className="aa-answer">
          {cat.name} AI agents are language-model agents that take on repeatable {cat.name.toLowerCase()} work. {cat.blurb} Below are {pages.length} guides, each covering what the agent does, how to build it, free repositories, platforms, KPIs and risks.
        </p>
        {fns.map((fn) => {
          const variants = pages.filter((p) => p.fn.slug === fn.slug && p.ind);
          return (
            <section key={fn.slug} className="aa-hub-cat" aria-labelledby={`fn-${fn.slug}`}>
              <h2 id={`fn-${fn.slug}`}>
                <Link href={`/ai-agents/${fn.slug}`}>{fn.name.replace(/^./, (c) => c.toUpperCase())}</Link>
              </h2>
              <p>{fn.answer}</p>
              {variants.length ? (
                <ul className="aa-chips">
                  {variants.map((v) => (
                    <li key={v.slug}>
                      <Link href={v.path}>{v.ind!.name}</Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
        <p>
          <Link href="/ai-agents">← All AI agent categories</Link>
        </p>
        <LeadCta agentName={`${cat.name.toLowerCase()} AI agent`} pagePath={`/ai-agents/category/${cat.id}`} heading={`Need a ${cat.name.toLowerCase()} AI agent? Tell us what you need`} />
      </article>
    </PageShell>
  );
}
