import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { agents, DEPARTMENTS } from "../data/agents";

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
  assert.match(html, /support@adiology\.io/);
  assert.doesNotMatch(html, /privacy\.html/);
});
