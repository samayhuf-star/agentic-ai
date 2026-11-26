import type { AgentDoc } from "@/lib/agent-types/compose";
import { AGENT_TYPES_PUBLISHED, AGENT_TYPES_UPDATED } from "@/lib/agent-types/data";
import { pricing } from "@/lib/config";
import { DEFAULT_OG, SITE, siteUrl } from "@/lib/site";
import { stripeSecretConfigured, usPriceCents } from "@/lib/us";

function strip(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
}

export function publisherLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: { "@type": "ImageObject", url: siteUrl("/media-kit/logo-1080.png") },
  };
}

export function authorLd() {
  return { "@type": "Person", name: SITE.founder, jobTitle: SITE.founderRole, url: siteUrl("/about"), worksFor: { "@id": `${SITE.url}/#organization` } };
}

/** The 55-agent product with honest prices. The USD offer is PreOrder until US card checkout is switched on. */
export function productLd() {
  const inr = pricing().inr;
  const usd = (usPriceCents() / 100).toFixed(2);
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE.url}/#product-55-agents`,
    name: "AI Time Machine: 55 AI agents",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl("/55-ai-agents"),
    description: "55 ready-made AI agents in 8 teams that draft sales, support, marketing, content, SEO, operations and money tasks for small businesses. Uses the AI provider key you connect. Nothing goes out until you approve it.",
    publisher: { "@id": `${SITE.url}/#organization` },
    offers: [
      { "@type": "Offer", price: String(inr), priceCurrency: "INR", url: siteUrl("/55-ai-agents"), availability: "https://schema.org/InStock", description: "One-time payment, India" },
      {
        "@type": "Offer",
        price: usd,
        priceCurrency: "USD",
        url: siteUrl("/us/55-ai-agents"),
        availability: stripeSecretConfigured() ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
        description: "One-time payment, outside India",
      },
    ],
  };
}

export function agentDocJsonLd(doc: AgentDoc) {
  const url = siteUrl(doc.page.path);
  const image = siteUrl(doc.blocks.find((b) => b.t === "shot")?.t === "shot" ? (doc.blocks.find((b) => b.t === "shot") as { src: string }).src : DEFAULT_OG);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "TechArticle",
      "@id": `${url}#article`,
      headline: doc.page.title.slice(0, 110),
      description: doc.page.description,
      abstract: doc.answer,
      inLanguage: "en",
      datePublished: AGENT_TYPES_PUBLISHED,
      dateModified: AGENT_TYPES_UPDATED,
      wordCount: doc.wordCount,
      author: authorLd(),
      publisher: publisherLd(),
      image,
      mainEntityOfPage: url,
      about: { "@type": "Thing", name: doc.page.name },
      citation: doc.sources.map((s) => ({ "@type": "CreativeWork", name: s.title, url: s.url, publisher: s.publisher })),
      isPartOf: { "@type": "CollectionPage", "@id": `${siteUrl("/ai-agents")}#hub`, name: "AI agents directory", url: siteUrl("/ai-agents") },
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: doc.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })),
    },
    {
      "@type": "HowTo",
      "@id": `${url}#howto`,
      name: doc.howTo.name,
      step: doc.howTo.steps.map((step, i) => ({ "@type": "HowToStep", position: i + 1, name: step.name, text: strip(step.text), url: `${url}#how-to-build` })),
    },
    productLd(),
  ];
  return { "@context": "https://schema.org", "@graph": graph };
}
