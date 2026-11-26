import functionsJson from "@/content/agent-types/functions.json";
import industriesJson from "@/content/agent-types/industries.json";
import platformsJson from "@/content/agent-types/platforms.json";
import reposJson from "@/content/agent-types/repos.json";
import sourcesJson from "@/content/agent-types/sources.json";

/** Bump when the dataset or page template changes in a way readers would notice. Used for lastmod and "Updated" dates. */
export const AGENT_TYPES_UPDATED = "2026-11-26";
export const AGENT_TYPES_PUBLISHED = "2026-11-26";

export type CategoryId = "sales" | "marketing" | "support" | "content" | "finance" | "hr" | "ops" | "it" | "legal" | "data";
export type BuildPattern = "tool-agent" | "router" | "pipeline" | "multi-agent" | "voice";

export type AgentFunction = {
  slug: string;
  name: string;
  cat: CategoryId;
  dept: string;
  answer: string;
  /** Short verb phrase for the core job, e.g. "answers buyer questions and drafts follow-ups". */
  job: string;
  defn: string;
  does: string[];
  tools: string[];
  data: string[];
  kpis: [string, string][];
  risks: [string, string][];
  flow: string[];
  prompt: string;
  pattern: BuildPattern;
  memory: string;
  rag: string;
  hitl: string;
  repos: string[];
  platforms: string[];
  faqs: [string, string][];
  related: string[];
  ours: string[];
  oursNote?: string;
  evals: string;
};

export type Industry = {
  slug: string;
  name: string;
  /** Lower-case phrase used after "for", e.g. "real estate agencies and brokers". */
  who: string;
  customers: string;
  intro: string;
  systems: string[];
  data: string[];
  pains: string[];
  regs: [string, string][];
  uses: Partial<Record<CategoryId, string>>;
  /** One concrete scenario per job category. */
  ex: Partial<Record<CategoryId, string>>;
  kpis: [string, string][];
  faq: [string, string];
};

export type Repo = { repo: string; license: string; desc: string; lang: string | null; archived: boolean };
export type Platform = { name: string; url: string; kind: string };
export type Source = { title: string; publisher: string; url: string };

export const FUNCTIONS = functionsJson as AgentFunction[];
export const INDUSTRIES = industriesJson as Industry[];
export const REPOS = reposJson.repos as Record<string, Repo>;
export const REPOS_VERIFIED = reposJson.verifiedAt;
export const PLATFORMS = platformsJson.platforms as Record<string, Platform>;
export const SOURCES = sourcesJson.sources as Record<string, Source>;

export const CATEGORIES: { id: CategoryId; name: string; blurb: string }[] = [
  { id: "sales", name: "Sales", blurb: "Agents that reply to leads, qualify them, follow up and keep the CRM current." },
  { id: "marketing", name: "Marketing", blurb: "Agents that plan campaigns, write ads and emails, run social media and SEO." },
  { id: "support", name: "Customer support", blurb: "Agents that answer customers, triage tickets, take calls and reply to reviews." },
  { id: "content", name: "Content", blurb: "Agents that research, draft and edit articles, product copy and newsletters." },
  { id: "finance", name: "Finance & accounting", blurb: "Agents that process invoices, keep the books, chase payments and audit expenses." },
  { id: "hr", name: "HR & recruiting", blurb: "Agents that support hiring, onboarding and employee questions." },
  { id: "ops", name: "Operations", blurb: "Agents that process documents, schedule appointments and manage purchasing." },
  { id: "it", name: "IT", blurb: "Agents that resolve employee IT requests through approved runbooks." },
  { id: "legal", name: "Legal", blurb: "Agents that extract contract terms and compare clauses against a playbook." },
  { id: "data", name: "Data & research", blurb: "Agents that analyse data and research topics with citations." },
];

export type AgentPage = {
  slug: string;
  path: string;
  kind: "function" | "industry";
  fn: AgentFunction;
  ind?: Industry;
  /** Display name, e.g. "AI sales agent for real estate". */
  name: string;
  title: string;
  description: string;
};

function capFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function titleCaseName(name: string) {
  return name
    .split(" ")
    .map((word) => (word === "AI" || word === "SDR" || word === "IT" ? word : word === "for" || word === "and" ? word : capFirst(word)))
    .join(" ");
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function functionPage(fn: AgentFunction): AgentPage {
  return {
    slug: fn.slug,
    path: `/ai-agents/${fn.slug}`,
    kind: "function",
    fn,
    name: fn.name,
    title: `${titleCaseName(fn.name)}: How It Works and How to Build One`,
    description: clip(fn.answer, 158),
  };
}

function industryPage(fn: AgentFunction, ind: Industry): AgentPage {
  const name = `${fn.name} for ${ind.name.toLowerCase()}`;
  return {
    slug: `${fn.slug}-for-${ind.slug}`,
    path: `/ai-agents/${fn.slug}-for-${ind.slug}`,
    kind: "industry",
    fn,
    ind,
    name,
    title: `${titleCaseName(fn.name)} for ${titleCaseName(ind.name)}: Use Cases, Stack and Build Guide`,
    description: clip(`${capFirst(fn.name)} for ${ind.who}: it ${fn.job}. Uses, build steps, free repos, platforms, KPIs and risks.`, 158),
  };
}

let cache: AgentPage[] | null = null;

export function allAgentPages(): AgentPage[] {
  if (cache) return cache;
  const pages = FUNCTIONS.map(functionPage);
  for (const ind of INDUSTRIES) {
    for (const fn of FUNCTIONS) pages.push(industryPage(fn, ind));
  }
  cache = pages;
  return pages;
}

export function agentPage(slug: string) {
  return allAgentPages().find((page) => page.slug === slug) ?? null;
}

export function categoryName(id: CategoryId) {
  return CATEGORIES.find((cat) => cat.id === id)?.name ?? id;
}

export function pagesInCategory(id: CategoryId) {
  return allAgentPages().filter((page) => page.fn.cat === id);
}

export function categoriesWithPages() {
  return CATEGORIES.filter((cat) => FUNCTIONS.some((fn) => fn.cat === cat.id));
}

export function functionBySlug(slug: string) {
  return FUNCTIONS.find((fn) => fn.slug === slug) ?? null;
}
