import { type AgentDoc, type Block, composeAgentDoc } from "@/lib/agent-types/compose";
import { AGENT_TYPES_UPDATED, allAgentPages, categoriesWithPages, FUNCTIONS, INDUSTRIES } from "@/lib/agent-types/data";
import { formatInr, pricing } from "@/lib/config";
import { SITE, siteUrl } from "@/lib/site";
import { usPriceLabel } from "@/lib/us";

function abs(text: string) {
  return text.replace(/\]\((\/[^)]*)\)/g, (_, path: string) => `](${siteUrl(path)})`);
}

function cell(text: string) {
  return abs(text).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function blockMd(block: Block, doc: AgentDoc): string {
  switch (block.t) {
    case "h2":
      return `## ${block.text}`;
    case "h3":
      return `### ${block.text}`;
    case "p":
      return abs(block.text);
    case "note":
      return `> ${abs(block.text)}`;
    case "ul":
      return block.items.map((item) => `- ${abs(item)}`).join("\n");
    case "ol":
      return block.items.map((item, i) => `${i + 1}. ${abs(item)}`).join("\n");
    case "table":
      return [`| ${block.head.join(" | ")} |`, `| ${block.head.map(() => "---").join(" | ")} |`, ...block.rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n");
    case "code":
      return `${block.label}:\n\n\`\`\`text\n${block.text}\n\`\`\``;
    case "arch":
      return `*Diagram: architecture of ${doc.page.name} (trigger → ${doc.page.fn.pattern} core with memory and retrieval → tools → human approval).*`;
    case "flow":
      return "";
    case "shot":
      return `![${block.alt}](${siteUrl(block.src)})\n\n*${block.caption}*`;
    case "faq":
      return block.items.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n");
    case "sources":
      return block.items.map((s, i) => `${i + 1}. [${s.title}](${s.url}) — ${s.publisher}`).join("\n");
    default:
      return "";
  }
}

export function agentDocMarkdown(doc: AgentDoc) {
  const url = siteUrl(doc.page.path);
  const parts = [
    `# ${doc.h1}`,
    `> ${doc.answer}`,
    `Canonical: ${url}  \nAuthor: ${SITE.founder}, ${SITE.founderRole}, ${SITE.name}  \nUpdated: ${doc.updated}`,
    "## Key facts",
    doc.facts.map(([k, v]) => `- **${k}:** ${v}`).join("\n"),
    ...doc.blocks.map((b) => blockMd(b, doc)).filter(Boolean),
    "## Related",
    doc.related.map((r) => `- [${r.name}](${siteUrl(r.path)})`).join("\n"),
    "## Get help or get started",
    `Ask for the agent you need with the form at ${url}#get-help. Or get AI Time Machine, 55 ready-made AI agents that draft work for you to approve: ${formatInr(pricing().inr)} one-time in India (${siteUrl("/55-ai-agents")}) or ${usPriceLabel()} one-time elsewhere (${siteUrl("/us/55-ai-agents")}).`,
  ];
  return `${parts.join("\n\n")}\n`;
}

export function llmsTxt() {
  const cats = categoriesWithPages();
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.name} sells 55 ready-made AI agents in 8 teams for small businesses (one-time ${formatInr(pricing().inr)} in India, ${usPriceLabel()} elsewhere). Agents draft work; the owner approves. This site also publishes an AI agents directory: plain-English guides to AI agent types with architecture, build steps, verified open-source repositories, commercial platforms, KPIs, risks and FAQs.`,
    "",
    `Updated: ${AGENT_TYPES_UPDATED}. Every guide has a Markdown version at the same URL plus ".md". Full text of all guides: ${siteUrl("/llms-full.txt")}`,
    "",
    "## AI agents directory",
    `- [AI agents directory (hub)](${siteUrl("/ai-agents")}): all agent types by category${INDUSTRIES.length ? " and industry" : ""}`,
    ...cats.map((cat) => `- [${cat.name} AI agents](${siteUrl(`/ai-agents/category/${cat.id}`)}): ${cat.blurb}`),
    "",
    "## Agent type guides",
    ...FUNCTIONS.map((fn) => `- [${fn.name}](${siteUrl(`/ai-agents/${fn.slug}`)}): ${fn.answer.split(". ")[0]}.`),
  ];
  if (INDUSTRIES.length) {
    lines.push("", "## Agent guides by industry");
    for (const ind of INDUSTRIES) lines.push(`- ${ind.name}: ${FUNCTIONS.map((fn) => `[${fn.name.replace(/^AI /, "")}](${siteUrl(`/ai-agents/${fn.slug}-for-${ind.slug}`)})`).join(", ")}`);
  }
  lines.push(
    "",
    "## Product",
    `- [55 AI agents offer, India](${siteUrl("/55-ai-agents")}): ${formatInr(pricing().inr)} one-time`,
    `- [55 AI agents offer, outside India](${siteUrl("/us/55-ai-agents")}): ${usPriceLabel()} one-time`,
    `- [Agents roster](${siteUrl("/agents")}): the 55 agents and their roles`,
    `- [About](${siteUrl("/about")}) · [Contact](${siteUrl("/contact")}) · [Privacy](${siteUrl("/privacy")})`,
    "",
  );
  return lines.join("\n");
}

export function llmsFullTxt() {
  const out = [llmsTxt(), "", "---", ""];
  for (const page of allAgentPages()) {
    const doc = composeAgentDoc(page);
    out.push(`# ${doc.h1}`, `URL: ${siteUrl(page.path)}`, "", doc.answer, "", ...doc.facts.map(([k, v]) => `- ${k}: ${v}`), "", "FAQ:", ...doc.faqs.map(([q, a]) => `- Q: ${q}\n  A: ${a}`), "", "---", "");
  }
  return out.join("\n");
}
