import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { agents, DEPARTMENTS } from "../data/agents";
import { approvalDetail, oneReassurance } from "../lib/approval-copy";
import { appOrigin } from "../lib/config";
import { cashfreeTarget } from "../lib/payments/gateways";

const expected: Record<string, number> = {
  "Marketing & ads": 10,
  Support: 9,
  Sales: 8,
  Content: 8,
  SEO: 6,
  Ops: 6,
  Money: 5,
  "CEO office": 3,
};

test("an approval card keeps a single reassurance", () => {
  const rohan = approvalDetail(
    { name: "Rohan", role: "Ads watcher", blurb: "Watches your ads and suggests what to pause or boost. No budget change without your yes." },
    "Chai and Co",
    "masala chai",
  );
  assert.doesNotMatch(rohan, /Nothing goes out, and no money is spent/);
  const shown = oneReassurance(`${rohan} This is only a suggestion. Nothing goes out, and no money is spent, until you tap yes.`);
  assert.match(shown, /No budget change without your yes\.$/);
  assert.doesNotMatch(shown, /This is only a suggestion/);
  const plain = approvalDetail({ name: "Aman", role: "Photo ideas", blurb: "Suggests photos to take." }, "Chai and Co", "masala chai");
  assert.equal((plain.match(/Nothing goes out/g) || []).length, 1);
});

test("the roster is 55 agents in the eight teams", () => {
  assert.equal(agents.length, 55);
  assert.equal(DEPARTMENTS.length, 8);
  for (const [name, count] of Object.entries(expected)) {
    assert.equal(agents.filter((agent) => agent.department === name).length, count, name);
  }
  assert.equal(new Set(agents.map((agent) => agent.id)).size, 55);
});

test("the home page keeps the approved hero words", () => {
  const html = fs.readFileSync(path.join(process.cwd(), "components/landing/body.html"), "utf8");
  assert.match(html, /55 agents that handle your company/);
  assert.match(html, /id="heroLine">at just</);
  assert.match(html, /One-time payment\./);
  assert.match(html, /No monthly subscription\./);
  assert.match(html, /support@theaitimemachine\.com/);
  assert.match(html, /Rizwiz Enterprises/);
  assert.match(html, /href="\/refund-policy"/);
  assert.match(html, /href="\/cookie-policy"/);
  assert.doesNotMatch(html, /privacy\.html/);
  assert.doesNotMatch(html, /support@adiology\.io/);
  assert.match(html, /theaitimemachine\.com\/dashboard/);
  assert.doesNotMatch(html, /adiology\.io\/app/);
  assert.match(html, /Plus 4 bonuses worth/);
  assert.match(html, /₹5,996/);
  assert.match(html, /\$72/);
  assert.match(html, /₹4,999/);
  assert.match(html, /₹1,999/);
  assert.doesNotMatch(html, /5 bonuses/);
  assert.doesNotMatch(html, /₹8,495/);
  assert.doesNotMatch(html, /2× more views/);
  assert.doesNotMatch(html, /₹1,800/);
  assert.doesNotMatch(html, /lookalike buyers/);
  assert.doesNotMatch(html, /listing views/);
  assert.doesNotMatch(html, /9999999999/);
  assert.match(html, /href="\/checkout"/);
});

test("public links use APP_URL and never a Railway host", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://www.theaitimemachine.com";
  assert.equal(appOrigin(new Request("https://web-production.up.railway.app/api/checkout")), "https://www.theaitimemachine.com");
  process.env.APP_URL = "https://theaitimemachine.com";
  assert.equal(appOrigin(), "https://www.theaitimemachine.com");
  delete process.env.APP_URL;
  assert.equal(appOrigin(new Request("https://web-production.up.railway.app/api/checkout")).includes("railway.app"), false);
  if (previous === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = previous;
});

test("Cashfree TEST uses the sandbox and PROD uses the live API", () => {
  const previous = process.env.CASHFREE_ENV;
  process.env.CASHFREE_ENV = "TEST";
  assert.equal(cashfreeTarget().apiBase, "https://sandbox.cashfree.com/pg");
  assert.equal(cashfreeTarget().mode, "sandbox");
  process.env.CASHFREE_ENV = "PROD";
  assert.equal(cashfreeTarget().apiBase, "https://api.cashfree.com/pg");
  assert.equal(cashfreeTarget().mode, "production");
  if (previous === undefined) delete process.env.CASHFREE_ENV;
  else process.env.CASHFREE_ENV = previous;
  const gateways = fs.readFileSync(path.join(process.cwd(), "lib/payments/gateways.ts"), "utf8");
  assert.doesNotMatch(gateways, /9999999999/);
  const returned = fs.readFileSync(path.join(process.cwd(), "app/checkout/return/page.tsx"), "utf8");
  assert.doesNotMatch(returned, /sample number/);
  assert.doesNotMatch(returned, /We need your real number/);
});
