import assert from "node:assert/strict";
import test from "node:test";
import { composeAgentDoc } from "../lib/agent-types/compose";
import { allAgentPages, FUNCTIONS, INDUSTRIES, PLATFORMS, REPOS, SOURCES } from "../lib/agent-types/data";
import { agentDocMarkdown, llmsTxt } from "../lib/agent-types/markdown";
import { agentDocJsonLd } from "../lib/agent-types/schema";
import { looksLikeTestLead, parseAgentLead } from "../lib/agent-leads/input";

test("every agent page has unique slug, title and description and 1000+ words", () => {
  const pages = allAgentPages();
  assert.equal(pages.length, FUNCTIONS.length * (1 + INDUSTRIES.length));
  for (const key of ["slug", "title", "description"] as const) assert.equal(new Set(pages.map((p) => p[key])).size, pages.length, key);
  for (const page of pages) {
    const doc = composeAgentDoc(page);
    assert.ok(doc.wordCount >= 1000, `${page.slug} has ${doc.wordCount} words`);
    const words = doc.answer.split(/\s+/).length;
    assert.ok(words >= 35 && words <= 75, `${page.slug} answer is ${words} words`);
    assert.ok(doc.faqs.length >= 4, page.slug);
  }
});

test("dataset references only verified repos, platforms and sources", () => {
  for (const fn of FUNCTIONS) {
    for (const id of fn.repos) assert.ok(REPOS[id], `${fn.slug} repo ${id}`);
    for (const id of fn.platforms) assert.ok(PLATFORMS[id], `${fn.slug} platform ${id}`);
  }
  for (const ind of INDUSTRIES) for (const [, id] of ind.regs) assert.ok(SOURCES[id], `${ind.slug} source ${id}`);
});

test("JSON-LD graph has article, FAQ, HowTo and an honest product offer", () => {
  const doc = composeAgentDoc(allAgentPages()[0]);
  const ld = agentDocJsonLd(doc) as { "@graph": Record<string, unknown>[] };
  const types = ld["@graph"].map((node) => node["@type"]);
  for (const type of ["TechArticle", "FAQPage", "HowTo", "SoftwareApplication"]) assert.ok(types.includes(type), type);
  const product = ld["@graph"].find((node) => node["@type"] === "SoftwareApplication") as { offers: { priceCurrency: string }[] };
  assert.deepEqual(product.offers.map((o) => o.priceCurrency).sort(), ["INR", "USD"]);
  assert.ok(!JSON.stringify(ld).includes("aggregateRating"));
});

test("markdown alternate and llms.txt list the pages", () => {
  const page = allAgentPages()[0];
  const md = agentDocMarkdown(composeAgentDoc(page));
  assert.match(md, /^# /);
  assert.ok(md.includes(`https://www.theaitimemachine.com${page.path}`));
  const llms = llmsTxt();
  for (const fn of FUNCTIONS) assert.ok(llms.includes(`/ai-agents/${fn.slug}`), fn.slug);
});

test("lead input validation and test detection", () => {
  assert.equal(looksLikeTestLead("a+leadtest@x.com", "need"), true);
  assert.equal(looksLikeTestLead("a@x.com", "[TEST] hello"), true);
  assert.equal(looksLikeTestLead("a@x.com", "real need"), false);
  const ok = parseAgentLead({ name: "A", email: "a@x.com", need: "A support agent", consent: true, pagePath: "/ai-agents/ai-sales-agent", timeZone: "Asia/Kolkata" });
  assert.equal(ok.pagePath, "/ai-agents/ai-sales-agent");
  assert.equal(parseAgentLead({ name: "A", email: "a@x.com", need: "Need one", consent: true, pagePath: "https://evil" }).pagePath, "/ai-agents");
  assert.throws(() => parseAgentLead({ name: "A", email: "a@x.com", need: "Need one" }));
  assert.throws(() => parseAgentLead({ name: "A", email: "bad", need: "Need one", consent: true }));
});
