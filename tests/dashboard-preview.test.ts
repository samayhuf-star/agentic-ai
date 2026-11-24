import assert from "node:assert/strict";
import test from "node:test";
import { BUSINESS_CATEGORIES, businessContext, parseBusinessChoice, saveButtonState, workPhrase } from "../lib/business-catalog";
import { composerState, groupChatList } from "../lib/dashboard/chat-view";
import { arrangeTeam, teamSummary } from "../lib/dashboard/team-view";
import { systemPrompt } from "../lib/llm";

const cards = [
  { id: "a", name: "Arjun", role: "Campaign planner", enabled: false, recommended: false, pinned: true, needsYou: false },
  { id: "b", name: "Zoya", role: "Customer replies", enabled: true, recommended: true, pinned: false, needsYou: true },
  { id: "c", name: "Rohan", role: "Ads watcher", enabled: true, recommended: false, pinned: true, needsYou: true },
  { id: "d", name: "Mira", role: "Posts and Reels", enabled: false, recommended: true, pinned: false, needsYou: false },
];

test("the category list is typed and health stays non-medical", () => {
  assert.equal(BUSINESS_CATEGORIES.length, 12);
  for (const category of BUSINESS_CATEGORIES) {
    assert.equal(category.types.at(-1)?.id, "other");
    assert.equal(category.types.at(-1)?.label, "Other (type it)");
  }
  const fitness = BUSINESS_CATEGORIES.find((item) => item.id === "fitness");
  assert.ok(fitness?.types.some((item) => item.label === "Gym"));
  assert.ok(fitness?.types.some((item) => item.label === "Yoga studio"));
  assert.ok(fitness?.types.some((item) => item.label === "Fitness coach"));
  const blob = JSON.stringify(BUSINESS_CATEGORIES).toLowerCase();
  assert.equal(blob.includes("clinic"), false);
  assert.equal(blob.includes("therapy"), false);
  const travel = parseBusinessChoice({ category: "travel", businessType: "agency" });
  assert.equal(travel.ok && travel.sells, "Travel agency (Travel & Tourism)");
  const custom = parseBusinessChoice({ category: "travel", businessType: "other", businessCustom: "Houseboat" });
  assert.equal(custom.ok && custom.businessCustom, "Houseboat");
});

test("prompts do not leak everyday work or a placeholder", () => {
  const empty = businessContext({ businessName: "My business", sells: "everyday work" }, null);
  assert.equal(empty, "The business is My business.");
  assert.equal(empty.includes("everyday work"), false);
  assert.equal(empty.includes("not set yet"), false);
  const set = businessContext({ businessName: "Northwind", category: "travel", businessType: "tours" }, "Get more customers");
  assert.match(set, /Tour operator \(Travel & Tourism\)/);
  assert.equal(set.includes("everyday work"), false);
  const prompt = systemPrompt(
    { name: "Zoya", role: "Customer replies", department: "Support", blurb: "Answers questions.", goals: "replies", id: "zoya", color: "#fff", sort: 1 } as never,
    { businessName: "My business", sells: null, goal: null, category: null, businessType: null, businessCustom: null, paused: false } as never,
  );
  assert.equal(prompt.includes("everyday work"), false);
  assert.equal(prompt.includes("not set yet"), false);
  assert.equal(prompt.includes("(everyday work)"), false);
  assert.equal(workPhrase({ sells: "masala chai" }), "masala chai");
});

test("save changes stays disabled until the form is dirty", () => {
  assert.deepEqual(saveButtonState(false, "idle"), { label: "Save changes", disabled: true });
  assert.deepEqual(saveButtonState(true, "idle"), { label: "Save changes", disabled: false });
  assert.deepEqual(saveButtonState(true, "saving"), { label: "Saving…", disabled: true });
  assert.deepEqual(saveButtonState(false, "saved"), { label: "Saved", disabled: true });
  assert.deepEqual(saveButtonState(true, "error"), { label: "Save changes", disabled: false });
});

test("team filters search and keep pinned cards above manual order", () => {
  assert.deepEqual(arrangeTeam(cards, "all", "").map((card) => card.id), ["c", "a", "b", "d"]);
  assert.deepEqual(arrangeTeam(cards, "on", "").map((card) => card.id), ["c", "b"]);
  assert.deepEqual(arrangeTeam(cards, "picked", "").map((card) => card.id), ["b", "d"]);
  assert.deepEqual(arrangeTeam(cards, "needs", "zoya").map((card) => card.name), ["Zoya"]);
  assert.deepEqual(teamSummary(cards), { on: 2, needs: 2 });
});

test("chat search groups pinned and needs-you first", () => {
  const agents = cards.map((card) => ({ id: card.id, name: card.name, role: card.role, pinned: card.pinned, needsYou: card.needsYou }));
  const grouped = groupChatList(agents, "");
  assert.deepEqual(grouped.pinned.map((agent) => agent.id), ["a", "c"]);
  assert.deepEqual(grouped.needs.map((agent) => agent.id), ["b"]);
  assert.deepEqual(grouped.rest.map((agent) => agent.id), ["d"]);
  assert.deepEqual(groupChatList(agents, "reels").rest.map((agent) => agent.name), ["Mira"]);
});

test("the composer stays shut without a key or an empty message", () => {
  assert.equal(composerState({ hasKey: false, text: "Hello", busy: false }).canSend, false);
  assert.match(composerState({ hasKey: false, text: "Hello", busy: false }).hint, /Connect your AI key/);
  assert.equal(composerState({ hasKey: true, text: "  ", busy: false }).disabled, true);
  assert.equal(composerState({ hasKey: true, text: "Hello", busy: true }).disabled, true);
  assert.equal(composerState({ hasKey: true, text: "Hello", busy: false }).canSend, true);
});
