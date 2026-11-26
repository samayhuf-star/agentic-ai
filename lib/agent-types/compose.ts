import {
  AGENT_TYPES_UPDATED,
  type AgentPage,
  type BuildPattern,
  agentPage,
  allAgentPages,
  categoryName,
  functionBySlug,
  PLATFORMS,
  REPOS,
  REPOS_VERIFIED,
  SOURCES,
  type Source,
  titleCaseName,
} from "@/lib/agent-types/data";
import { agents as productAgents } from "@/data/agents";

/** Inline text supports [label](url) links and **bold**. */
export type Block =
  | { t: "h2"; id: string; text: string }
  | { t: "h3"; text: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "table"; caption: string; head: string[]; rows: string[][] }
  | { t: "code"; text: string; label: string }
  | { t: "arch" }
  | { t: "flow" }
  | { t: "shot"; src: string; alt: string; caption: string; width: number; height: number }
  | { t: "faq"; items: [string, string][] }
  | { t: "sources"; items: Source[] }
  | { t: "note"; text: string };

export type AgentDoc = {
  page: AgentPage;
  h1: string;
  answer: string;
  facts: [string, string][];
  blocks: Block[];
  faqs: [string, string][];
  howTo: { name: string; steps: { name: string; text: string }[] };
  sources: Source[];
  related: AgentPage[];
  updated: string;
  wordCount: number;
};

const PATTERN: Record<BuildPattern, { label: string; how: string; why: string; time: string; source: string }> = {
  "tool-agent": {
    label: "Single agent with tools",
    how: "The model runs a loop: read the request, decide which tool to call, read the tool result, and repeat until it can answer or needs a person. This is the reason-and-act (ReAct) pattern most frameworks implement.",
    why: "Requests vary a lot from one conversation to the next, so a fixed script would break. A tool loop lets the agent take a different path each time while the tools themselves stay narrow and safe.",
    time: "Prototype in 2-5 days; production with evaluation and approvals in about 3-6 weeks",
    source: "react",
  },
  router: {
    label: "Router (classify, then hand off)",
    how: "The model classifies each input into a small set of labels and a confidence score, then fixed code routes it to the right queue, person or follow-up step. The model never acts outside those routes.",
    why: "The job is a decision, not a conversation. Routing keeps behaviour predictable, cheap to run (small models often suffice) and easy to evaluate against labelled history.",
    time: "Prototype in 1-3 days; production in about 1-3 weeks",
    source: "anthropic-agents",
  },
  pipeline: {
    label: "Fixed pipeline (prompt chaining)",
    how: "Work moves through ordered steps, each with its own narrow prompt and a check between steps: for example extract, validate, draft, review. If a check fails, the item stops and goes to a person.",
    why: "The task has a known shape. Splitting it into steps makes each step more accurate and lets you test and improve them one at a time.",
    time: "Prototype in 3-7 days; production in about 2-4 weeks",
    source: "anthropic-agents",
  },
  "multi-agent": {
    label: "Orchestrator with specialist agents",
    how: "A planner agent breaks the goal into sub-tasks and hands them to specialist agents (for example a researcher, a writer and an analyst). A reviewer step checks the combined result before a person sees it.",
    why: "The work spans different skills and data sources. Specialists with focused prompts and tools tend to outperform one agent juggling everything, at the cost of more moving parts to monitor.",
    time: "Prototype in 1-2 weeks; production in about 4-8 weeks",
    source: "anthropic-agents",
  },
  voice: {
    label: "Real-time voice loop",
    how: "Caller audio streams to speech-to-text, the transcript goes to the model with tools, and the reply streams back through text-to-speech. Turn detection and interruption handling decide when the agent speaks.",
    why: "Phone callers expect replies within about a second. A streaming pipeline keeps latency low while the model still uses tools such as the calendar or CRM.",
    time: "Prototype in 3-7 days; production with telephony and testing in about 3-8 weeks",
    source: "openai-guide",
  },
};

const SHOTS: Record<string, { file: string; agent: string; what: string }> = {
  Sales: { file: "chat-sales", agent: "kabir", what: "drafting three lead follow-up messages that wait for approval" },
  Support: { file: "chat-support", agent: "zoya", what: "drafting a reply to a customer asking about a late order" },
  "Marketing & ads": { file: "chat-marketing", agent: "arjun", what: "drafting a two-week campaign plan for review" },
  Content: { file: "chat-content", agent: "mira", what: "drafting three Instagram captions" },
  SEO: { file: "chat-seo", agent: "isha", what: "suggesting pages people search for" },
  Ops: { file: "chat-ops", agent: "fatima", what: "drafting a daily store checklist" },
  Money: { file: "chat-money", agent: "tara", what: "drafting an invoice that stays a draft until approved" },
  "CEO office": { file: "chat-ceo", agent: "noor", what: "writing a morning brief of what needs attention" },
};

export function shortTool(label: string) {
  return label.replace(/\s*\(.*?\)\s*/g, "").trim();
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return Math.abs(h);
}

function lc(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function an(word: string) {
  return /^(ai|a[^i]|e|i|o|u)/i.test(word) && !/^(eu|uni|use)/i.test(word) ? "an" : "a";
}

function link(label: string, url: string) {
  return `[${label}](${url})`;
}

function src(id: string) {
  const s = SOURCES[id];
  return s ? link(`${s.publisher}: ${s.title}`, s.url) : "";
}

function oursFor(page: AgentPage) {
  return page.fn.ours
    .map((id) => productAgents.find((agent) => agent.id === id))
    .filter((agent): agent is (typeof productAgents)[number] => Boolean(agent));
}

function screenshotBlocks(page: AgentPage): Block[] {
  const shot = SHOTS[page.fn.dept] ?? SHOTS.Ops;
  const agent = productAgents.find((item) => item.id === shot.agent);
  const label = agent ? `${agent.name} (${agent.role}, ${agent.department} team)` : page.fn.dept;
  return [
    {
      t: "shot",
      src: `/ai-agents/shots/${shot.file}.webp`,
      width: 1280,
      height: 560,
      alt: `AI Time Machine chat screen showing ${label} ${shot.what}. Demo account with sample data.`,
      caption: `Real AI Time Machine screen, demo account with sample data: ${label} ${shot.what}. It shows the approve-first pattern described on this page, not a custom-built ${page.fn.name}.`,
    },
  ];
}

function approvalShot(page: AgentPage): Block {
  const useYes = hash(page.slug) % 2 === 0;
  return useYes
    ? {
        t: "shot",
        src: "/ai-agents/shots/yes.webp",
        width: 1280,
        height: 800,
        alt: "AI Time Machine 'Needs your yes' queue listing agent drafts with Yes, approve and Not now buttons. Demo account with sample data.",
        caption: "A human-approval queue in AI Time Machine (demo data). Every draft waits for a person to approve it, the same control we recommend for any agent that sends, spends or commits.",
      }
    : {
        t: "shot",
        src: "/ai-agents/shots/team.webp",
        width: 1280,
        height: 800,
        alt: "AI Time Machine 'My team' screen with agent cards grouped by team, each with an on/off switch. Demo account with sample data.",
        caption: "Turning agents on and off per role in AI Time Machine (demo data). Scoping each agent to one job keeps its tools and permissions small.",
      };
}

function wordsIn(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

export function blockText(block: Block): string {
  switch (block.t) {
    case "h2":
    case "h3":
    case "p":
    case "note":
      return block.text;
    case "ul":
    case "ol":
      return block.items.join(" ");
    case "table":
      return [block.caption, ...block.head, ...block.rows.flat()].join(" ");
    case "code":
      return block.text;
    case "shot":
      return block.caption;
    case "faq":
      return block.items.flat().join(" ");
    case "sources":
      return block.items.map((s) => `${s.publisher} ${s.title}`).join(" ");
    default:
      return "";
  }
}

export function composeAgentDoc(page: AgentPage): AgentDoc {
  const { fn, ind } = page;
  const pattern = PATTERN[fn.pattern];
  const name = page.name;
  const Name = titleCaseName(name);
  const where = ind ? ` in ${ind.name.toLowerCase()}` : "";
  const h = hash(page.slug);
  const blocks: Block[] = [];
  const faqs: [string, string][] = [];
  const sourceIds = new Set<string>(["anthropic-agents", "openai-guide", pattern.source, "nist-rmf", "owasp-llm"]);
  if (fn.pattern === "tool-agent" || fn.pattern === "voice") sourceIds.add("openai-fc");
  if (fn.rag) sourceIds.add("rag");
  sourceIds.add(h % 2 ? "mcp" : "anthropic-tools");

  // --- direct answer ---
  const use = ind?.uses[fn.cat];
  const answer = ind
    ? `${an(name)[0].toUpperCase()}${an(name).slice(1)} ${name} is a language-model agent that ${use ?? lc(fn.does[0])}. It connects to systems such as ${shortTool(ind.systems[0])} and ${shortTool(ind.systems[1])}, works from approved ${lc(ind.data[0])}, and keeps a person approving anything that commits money, terms or ${lc(ind.customers)}' personal data.`
    : fn.answer;

  const repoIds = fn.repos.filter((id) => REPOS[id]);
  const activeRepos = repoIds.filter((id) => !REPOS[id].archived);

  const facts: [string, string][] = [
    ["What it is", ind ? `${titleCaseName(fn.name)} adapted to ${ind.who}` : `A ${categoryName(fn.cat).toLowerCase()} agent built on a large language model`],
    ["Build pattern", pattern.label],
    ["Core tools", fn.tools.slice(0, 3).map(shortTool).join(", ") + (ind ? `, ${shortTool(ind.systems[0])}` : "")],
    ["Human approval", fn.hitl],
    ["Typical build time", pattern.time],
    ["Free starting points", activeRepos.slice(0, 3).map((id) => REPOS[id].repo).join(", ")],
    ["Last reviewed", AGENT_TYPES_UPDATED],
  ];
  if (ind) facts.splice(4, 0, ["Key rules to check", ind.regs.map(([text]) => text.split(" — ")[0]).slice(0, 3).join("; ")]);

  // --- what is it ---
  blocks.push({ t: "h2", id: "what-is-it", text: `What is ${an(name)} ${name}?` });
  if (ind) {
    blocks.push({ t: "p", text: `${ind.intro} ${an(name)[0].toUpperCase()}${an(name).slice(1)} ${name} applies the ${fn.name} idea to that setting: ${lc(fn.defn)}` });
    blocks.push({ t: "p", text: `For ${ind.who}, the people on the other side are ${ind.customers}. The agent has to speak their language, respect the rules of the sector and work inside the systems the team already uses rather than adding another dashboard.` });
  } else {
    blocks.push({ t: "p", text: fn.defn });
    blocks.push({ t: "p", text: `In short: a person still owns the outcome. The agent does the repetitive reading, writing and lookups, and ${lc(fn.hitl)}` });
  }

  // --- what it does / use cases ---
  if (ind) {
    blocks.push({ t: "h2", id: "use-cases", text: `What does ${an(name)} ${name} do?` });
    blocks.push({ t: "p", text: `The core job${where}: ${use ?? lc(fn.does[0])}. A typical example: ${lc(ind.example)}` });
    blocks.push({ t: "h3", text: `Tasks it can take on for ${ind.who}` });
    blocks.push({ t: "ul", items: fn.does });
    blocks.push({ t: "h3", text: `Problems it helps with${where}` });
    blocks.push({ t: "ul", items: ind.pains });
  } else {
    blocks.push({ t: "h2", id: "what-it-does", text: `What does ${an(name)} ${name} do?` });
    blocks.push({ t: "p", text: `Most teams start with two or three of these tasks and add more once the first ones are reliable:` });
    blocks.push({ t: "ul", items: fn.does });
  }
  blocks.push(...screenshotBlocks(page));

  // --- architecture ---
  blocks.push({ t: "h2", id: "how-it-works", text: `How does ${an(name)} ${name} work?` });
  blocks.push({ t: "p", text: `Recommended architecture: **${pattern.label.toLowerCase()}**. ${pattern.how}` });
  blocks.push({ t: "p", text: `Why this pattern fits: ${lc(pattern.why)} Anthropic's guide to agent design makes the same point: start with the simplest pattern that works and add autonomy only when it clearly helps (${src("anthropic-agents")}).` });
  blocks.push({ t: "arch" });
  const compRows: string[][] = [
    ["Language model", `Reads the request, decides the next step and writes drafts${fn.pattern === "router" ? "; a small, fast model is often enough for classification" : ""}`, "GPT, Claude, Gemini, or open-weight models such as Llama, Qwen or Mistral via a gateway like LiteLLM"],
    ["Tools", `Actions the agent may take: ${fn.tools.slice(0, 4).map(shortTool).join(", ")}`, "Function calling or Model Context Protocol (MCP) servers"],
    ["Knowledge (RAG)", fn.rag, "A vector store such as Chroma or Qdrant, or your database's search"],
    ["Memory", fn.memory, "CRM or database records; a memory layer such as Mem0 or Zep for longer histories"],
    ["Orchestration", pattern.label, activeRepos.slice(0, 2).map((id) => REPOS[id].repo.split("/")[1]).join(" or ")],
    ["Guardrails & approval", fn.hitl, "Approval queue, allow-listed actions, logging"],
  ];
  if (ind) compRows.splice(2, 0, ["Industry systems", `Where ${ind.customers} records and work items live`, ind.systems.slice(0, 3).map(shortTool).join(", ")]);
  blocks.push({ t: "table", caption: `Components of ${an(name)} ${name}`, head: ["Component", "Role in this agent", "Example options"], rows: compRows });
  blocks.push({ t: "h3", text: "Data the agent needs" });
  blocks.push({ t: "ul", items: ind ? [...ind.data, ...fn.data.slice(0, 2)] : fn.data });

  // --- example workflow ---
  blocks.push({ t: "h2", id: "workflow", text: `What does ${an(name)} ${name} workflow look like?` });
  blocks.push({ t: "p", text: `A typical run, from trigger to a logged result${where}:` });
  blocks.push({ t: "flow" });
  blocks.push({ t: "ol", items: fn.flow });

  // --- build guide ---
  const steps: { name: string; text: string }[] = [
    { name: "Define the scope", text: `Pick two or three tasks to automate first (for example: ${fn.does.slice(0, 2).map(lc).join("; ")}). Write down what the agent must never do.` },
    { name: "Collect the knowledge", text: `Gather ${(ind ? ind.data.slice(0, 2) : fn.data.slice(0, 2)).map(lc).join(" and ")}. Clean, current documents matter more than model choice.` },
    { name: "Choose the stack", text: `Use the ${pattern.label.toLowerCase()} pattern. Free options include ${activeRepos.slice(0, 3).map((id) => REPOS[id].repo).join(", ")}; pick one your team can maintain.` },
    { name: "Connect the tools", text: `Give the agent narrow, least-privilege access to ${fn.tools.slice(0, 3).map(shortTool).join(", ")}${ind ? ` and ${shortTool(ind.systems[0])}` : ""}. Start read-only where you can.` },
    { name: "Write the instructions", text: "Write a system prompt with the role, allowed sources, tone, limits and when to hand off. Keep examples of good outputs next to it." },
    { name: "Add retrieval and memory", text: `${fn.rag} ${fn.memory}` },
    { name: "Add guardrails and approvals", text: `${fn.hitl} Log every tool call and output.` },
    { name: "Evaluate before launch", text: fn.evals },
    { name: "Launch small and monitor", text: `Roll out to one team, channel or segment. Track ${fn.kpis.slice(0, 2).map(([k]) => k.toLowerCase()).join(" and ")}, review failures weekly and expand only when quality holds.` },
  ];
  blocks.push({ t: "h2", id: "how-to-build", text: `How do you build ${an(name)} ${name}, step by step?` });
  blocks.push({ t: "ol", items: steps.map((step) => `**${step.name}.** ${step.text}`) });
  blocks.push({ t: "code", label: "Example system prompt (edit the {placeholders})", text: fn.prompt });
  blocks.push({ t: "p", text: `For model tool use, see the official guides on ${src("openai-fc")} and ${src("anthropic-tools")}. OpenAI's ${link("practical guide to building agents", SOURCES["openai-guide"].url)} covers instructions, tools and guardrails in more depth.` });

  // --- repos ---
  blocks.push({ t: "h2", id: "open-source", text: `Which free, open-source repos can you use to build ${an(name)} ${name}?` });
  blocks.push({ t: "p", text: `Each repository below was checked on GitHub on ${REPOS_VERIFIED}. Licences differ, and some "fair-code" or source-available licences limit commercial hosting, so read the licence before you ship.` });
  blocks.push({
    t: "table",
    caption: "Open-source repositories",
    head: ["Repository", "What it is", "Licence", "Language"],
    rows: repoIds.map((id) => {
      const r = REPOS[id];
      return [link(r.repo, `https://github.com/${r.repo}`), `${r.desc}${r.archived ? " (repository archived; fine for learning, check for a maintained successor)" : ""}`, r.license, r.lang ?? "-"];
    }),
  });

  // --- platforms ---
  blocks.push({ t: "h2", id: "platforms", text: `Which AI platforms offer ${fn.name}s?` });
  blocks.push({ t: "p", text: "If you would rather buy than build, these commercial products offer agents or features for this job. We list them for reference only; we are not affiliated with them, and features and pricing change, so check each vendor's site." });
  blocks.push({
    t: "table",
    caption: "Commercial platforms",
    head: ["Platform", "Type"],
    rows: fn.platforms.filter((id) => PLATFORMS[id]).map((id) => [link(PLATFORMS[id].name, PLATFORMS[id].url), PLATFORMS[id].kind]),
  });
  blocks.push({ t: "h3", text: "Build, buy, or start with ready-made agents?" });
  blocks.push({
    t: "table",
    caption: "Build vs buy comparison",
    head: ["Option", "Effort", "Cost model", "Best for"],
    rows: [
      ["Build with open source", "High: engineering, hosting, evaluation", "Free code; you pay for models and hosting", "Teams with developers that need full control or custom integrations"],
      ["Commercial agent platform", "Medium: configuration and integration", "Usually subscription or per-conversation pricing", `Companies already on that vendor's ${fn.cat === "support" ? "help desk" : fn.cat === "sales" || fn.cat === "marketing" ? "CRM or marketing stack" : "suite"}`],
      ["AI Time Machine (55 ready-made agents)", "Low: sign in, connect your own AI key, choose agents", "One-time payment", "Small businesses that want drafts for everyday sales, support, marketing and admin work, approved by a person"],
    ],
  });

  // --- KPIs ---
  blocks.push({ t: "h2", id: "kpis", text: `How do you measure ${an(name)} ${name}?` });
  blocks.push({ t: "p", text: "Measure outcomes, not activity. Set a baseline before launch so you can show the change:" });
  blocks.push({ t: "table", caption: "KPIs", head: ["Metric", "How to measure it"], rows: ind ? [...fn.kpis.slice(0, 3), ...ind.kpis] : fn.kpis });

  // --- risks ---
  blocks.push({ t: "h2", id: "risks", text: `What are the risks of ${an(name)} ${name}, and how do you control them?` });
  blocks.push({ t: "table", caption: "Risks and controls", head: ["Risk", "Control"], rows: fn.risks });
  if (ind) {
    blocks.push({ t: "h3", text: `Rules and standards to check${where}` });
    blocks.push({ t: "ul", items: ind.regs.map(([text, id]) => (SOURCES[id] ? `${text} (${link(SOURCES[id].publisher, SOURCES[id].url)})` : text)) });
    for (const [, id] of ind.regs) if (SOURCES[id]) sourceIds.add(id);
    blocks.push({ t: "note", text: "This is general information, not legal advice. Requirements depend on your country, state and use case." });
  }
  blocks.push({ t: "p", text: `General AI security risks such as prompt injection, data leakage and excessive agent permissions are catalogued in the ${src("owasp-llm")}. For governance, the ${src("nist-rmf")} is a widely used framework.` });
  blocks.push(approvalShot(page));

  // --- our product, honestly ---
  const ours = oursFor(page);
  blocks.push({ t: "h2", id: "ai-time-machine", text: `Can AI Time Machine help with ${ind ? `${categoryName(fn.cat).toLowerCase()} work${where}` : `${categoryName(fn.cat).toLowerCase()} work`}?` });
  if (ours.length) {
    blocks.push({ t: "p", text: `AI Time Machine is a set of 55 ready-made AI agents in 8 teams for small businesses. It is not a custom agent builder and does not connect to ${shortTool(fn.tools[0])} on its own. The agents closest to this job draft work in their role, using the AI provider key you connect, and nothing goes out until you approve it:` });
    blocks.push({ t: "ul", items: ours.map((agent) => `${link(`${agent.name}, ${agent.role}`, `/agents/${agent.id}`)} (${agent.department}): ${agent.blurb}`) });
  } else {
    blocks.push({ t: "p", text: `${fn.oursNote ?? "AI Time Machine does not include an agent for this job."} AI Time Machine is a set of 55 ready-made agents in 8 teams that draft everyday sales, support, marketing, content, SEO, operations and money tasks for small businesses, with every draft approved by you. If you need ${an(name)} ${name}, the build guide and repositories above are the better route.` });
  }

  // --- FAQ ---
  const fnFaqs = ind ? fn.faqs.slice(0, 3) : fn.faqs;
  faqs.push(...fnFaqs);
  if (ind) {
    faqs.push(ind.faq);
    faqs.push([
      `Can a small ${ind.name.toLowerCase()} business build ${an(name)} ${name} without developers?`,
      `Partly. No-code tools such as n8n, Dify or Langflow can connect a model to ${shortTool(ind.systems[0])} and email for a first version. Integrations with ${shortTool(ind.systems[1])}, approvals and testing usually need some technical help.`,
    ]);
  } else {
    faqs.push([
      `Do I need to code to build ${an(name)} ${name}?`,
      `Not for a first version. Visual tools such as n8n, Dify, Flowise or Langflow can connect a model, your documents and ${shortTool(fn.tools[0])}. Production systems with approvals, logging and evaluation usually need a developer.`,
    ]);
    faqs.push([
      `How much does it cost to run ${an(name)} ${name}?`,
      "Costs come from model usage (priced per token), hosting, and any paid tools or APIs. Routing simple steps to smaller models and caching retrieved documents keeps costs down. Measure cost per completed task, not per message.",
    ]);
  }
  blocks.push({ t: "h2", id: "faq", text: "Frequently asked questions" });
  blocks.push({ t: "faq", items: faqs });

  // --- related ---
  const related: AgentPage[] = [];
  const push = (p: AgentPage | null) => {
    if (p && p.slug !== page.slug && !related.some((r) => r.slug === p.slug)) related.push(p);
  };
  if (ind) {
    push(agentPage(fn.slug));
    for (const slug of fn.related) push(agentPage(`${slug}-for-${ind.slug}`));
    const others = allAgentPages().filter((p) => p.fn.slug === fn.slug && p.ind && p.ind.slug !== ind.slug);
    for (let i = 0; i < 3 && others.length; i++) push(others[(h + i * 7) % others.length]);
  } else {
    for (const slug of fn.related) push(agentPage(slug));
    const variants = allAgentPages().filter((p) => p.fn.slug === fn.slug && p.ind);
    for (let i = 0; i < 4 && variants.length; i++) push(variants[(h + i * 5) % variants.length]);
  }
  for (const slug of fn.related) if (!functionBySlug(slug)) throw new Error(`unknown related ${slug}`);

  const sources = [...sourceIds].map((id) => SOURCES[id]).filter(Boolean);
  blocks.push({ t: "h2", id: "sources", text: "Sources and further reading" });
  blocks.push({ t: "sources", items: sources });

  const wordCount = wordsIn(answer) + facts.reduce((n, [k, v]) => n + wordsIn(`${k} ${v}`), 0) + blocks.reduce((n, b) => n + wordsIn(blockText(b)), 0);

  return {
    page,
    h1: ind ? `${Name}` : `${Name}: What It Is, How It Works and How to Build One`,
    answer,
    facts,
    blocks,
    faqs,
    howTo: { name: `How to build ${an(name)} ${name}`, steps },
    sources,
    related: related.slice(0, 8),
    updated: AGENT_TYPES_UPDATED,
    wordCount,
  };
}
