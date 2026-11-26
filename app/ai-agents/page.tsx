import Link from "next/link";
import { LeadCta } from "@/components/agent-types/LeadCta";
import { JsonLd } from "@/components/marketing/JsonLd";
import { PageShell } from "@/components/marketing/PageShell";
import { AGENT_TYPES_UPDATED, allAgentPages, categoriesWithPages, FUNCTIONS, INDUSTRIES, pagesInCategory } from "@/lib/agent-types/data";
import { authorLd, productLd, publisherLd } from "@/lib/agent-types/schema";
import { pageMeta, siteUrl } from "@/lib/site";
import "./aa.css";

const TITLE = "AI Agents Directory: Types, Use Cases and How to Build Them";
const DESCRIPTION = "Explained guides to AI agent types for sales, support, marketing, finance, HR, operations, IT, legal and data, with architecture, free open-source repos, platforms, KPIs and risks.";

export function generateMetadata() {
  const meta = pageMeta(TITLE, DESCRIPTION, "/ai-agents");
  return { ...meta, title: { absolute: `${TITLE} | AI Time Machine` }, alternates: { canonical: siteUrl("/ai-agents"), types: { "text/plain": siteUrl("/llms.txt") } } };
}

export default function AgentsHub() {
  const pages = allAgentPages();
  const cats = categoriesWithPages();
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl("/ai-agents")}#hub`,
        name: TITLE,
        description: DESCRIPTION,
        url: siteUrl("/ai-agents"),
        dateModified: AGENT_TYPES_UPDATED,
        author: authorLd(),
        publisher: publisherLd(),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: FUNCTIONS.length,
          itemListElement: FUNCTIONS.map((fn, i) => ({ "@type": "ListItem", position: i + 1, url: siteUrl(`/ai-agents/${fn.slug}`), name: fn.name })),
        },
      },
      productLd(),
    ],
  };
  return (
    <PageShell crumbs={[{ name: "AI agents", path: "/ai-agents" }]}>
      <JsonLd data={ld} />
      <article className="aa-article">
        <p className="mk-kicker">AI agents directory</p>
        <h1>AI agent types, explained: what they do and how to build them</h1>
        <p className="aa-answer">
          An AI agent is software that uses a large language model to decide and take steps toward a goal: it reads a request, calls tools such as a CRM or inbox, checks the result and either finishes or hands off to a person. This directory explains {pages.length} agent types by job{INDUSTRIES.length ? " and industry" : ""}, each with an architecture, a build guide, free repositories and the risks to control.
        </p>
        <p className="aa-byline">
          Maintained by <Link href="/about">Samay Vashsht</Link>, Founder, AI Time Machine · Updated <time dateTime={AGENT_TYPES_UPDATED}>{AGENT_TYPES_UPDATED}</time> · Machine-readable index: <a href="/llms.txt">llms.txt</a>
        </p>
        <aside className="aa-facts" aria-labelledby="hub-facts">
          <h2 id="hub-facts">Key facts</h2>
          <dl>
            <div>
              <dt>Agent guides</dt>
              <dd>{pages.length}</dd>
            </div>
            <div>
              <dt>Job categories</dt>
              <dd>{cats.length}</dd>
            </div>
            {INDUSTRIES.length ? (
              <div>
                <dt>Industries covered</dt>
                <dd>{INDUSTRIES.length}</dd>
              </div>
            ) : null}
            <div>
              <dt>Every guide includes</dt>
              <dd>Direct answer, architecture diagram, step-by-step build, verified open-source repos, platforms, KPIs, risks, FAQ and sources</dd>
            </div>
          </dl>
        </aside>
        {cats.map((cat) => {
          const fns = FUNCTIONS.filter((fn) => fn.cat === cat.id);
          return (
            <section key={cat.id} className="aa-hub-cat" aria-labelledby={`cat-${cat.id}`}>
              <h2 id={`cat-${cat.id}`}>
                <Link href={`/ai-agents/category/${cat.id}`}>{cat.name} agents</Link>
              </h2>
              <p>
                {cat.blurb} {pagesInCategory(cat.id).length} guides.
              </p>
              <div className="mk-grid">
                {fns.map((fn) => (
                  <Link key={fn.slug} className="mk-card" href={`/ai-agents/${fn.slug}`}>
                    <h3>{fn.name.replace(/^./, (c) => c.toUpperCase())}</h3>
                    <p>{fn.answer.split(". ")[0]}.</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
        {INDUSTRIES.length ? (
          <section className="aa-hub-cat" aria-labelledby="by-industry">
            <h2 id="by-industry">AI agents by industry</h2>
            <ul className="aa-chips">
              {INDUSTRIES.map((ind) => (
                <li key={ind.slug}>
                  <Link href={`/ai-agents/ai-customer-support-agent-for-${ind.slug}`}>{ind.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className="mk-prose aa-prose" aria-labelledby="how-agents-work">
          <h2 id="how-agents-work">How do AI agents work?</h2>
          <p>
            Most business agents combine five parts: a language model that reasons and writes, tools it is allowed to call (APIs, databases, email), knowledge it retrieves (retrieval-augmented generation, or RAG), memory of past interactions, and an orchestration layer that controls the steps. Good agents add guardrails and a human approval step for anything that sends, spends or commits.
          </p>
          <h2 id="which-pattern">Which agent pattern should you choose?</h2>
          <div className="aa-table-wrap">
            <table className="mk-table aa-table">
              <caption>Common agent patterns</caption>
              <thead>
                <tr>
                  <th scope="col">Pattern</th>
                  <th scope="col">How it works</th>
                  <th scope="col">Good for</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Router</th>
                  <td>Classify the input, then hand off to fixed handlers</td>
                  <td>Ticket triage, lead routing, review sorting</td>
                </tr>
                <tr>
                  <th scope="row">Pipeline</th>
                  <td>Ordered steps with checks between them</td>
                  <td>Invoices, documents, content, outbound email</td>
                </tr>
                <tr>
                  <th scope="row">Single agent with tools</th>
                  <td>Model loops: reason, call a tool, read the result</td>
                  <td>Support, sales replies, IT requests, analytics</td>
                </tr>
                <tr>
                  <th scope="row">Orchestrator + specialists</th>
                  <td>Planner splits work across focused agents</td>
                  <td>Research, campaigns, procurement</td>
                </tr>
                <tr>
                  <th scope="row">Real-time voice</th>
                  <td>Speech-to-text, model with tools, text-to-speech</td>
                  <td>Phone reception and booking</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Further reading: <a href="https://www.anthropic.com/engineering/building-effective-agents" rel="noopener" target="_blank">Anthropic, Building effective agents</a> and{" "}
            <a href="https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/" rel="noopener" target="_blank">OpenAI, A practical guide to building agents</a>.
          </p>
        </section>
        <LeadCta agentName="an AI agent" pagePath="/ai-agents" heading="Need an AI agent for your business? Tell us what you need" />
      </article>
    </PageShell>
  );
}
