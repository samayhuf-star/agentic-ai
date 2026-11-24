import assert from "node:assert/strict";
import test from "node:test";
import { showsCustomType } from "../components/BusinessPicker";
import { BUSINESS_CATEGORIES } from "../lib/business-catalog";
import { businessPromptLine, validateBusinessSelection, workLabel } from "../lib/business-profile";
import { chatHasUsableKey, composerState, groupChatAgents, messagesAfterSend } from "../lib/chat-view";
import { prisma } from "../lib/prisma";
import { hashSecret, randomToken } from "../lib/crypto";
import { POST as chat } from "../app/api/dashboard/chat/route";
import { buildSystemPrompt } from "../lib/llm";
import { saveButtonState } from "../lib/settings-view";
import { filterTeam, sortTeam, summaryLine, teamSummary } from "../lib/team-view";

const agent = {
  name: "Mira",
  role: "Posts and Reels",
  department: "Content",
  blurb: "Drafts posts and Reel ideas in your voice.",
  goals: "posts",
};

test("category config covers the list, travel examples, and a typed other", () => {
  assert.equal(BUSINESS_CATEGORIES.length, 12);
  const labels = BUSINESS_CATEGORIES.map((category) => category.label);
  for (const label of [
    "Travel & Tourism",
    "Education & Coaching",
    "Manufacturing",
    "Online Services",
    "Retail & E-commerce",
    "Food & Restaurants",
    "Health & Fitness",
    "Real Estate",
    "Beauty & Salon",
    "Professional Services",
    "Events",
    "Other",
  ]) {
    assert.ok(labels.includes(label), label);
  }
  const travel = BUSINESS_CATEGORIES.find((category) => category.id === "travel");
  assert.deepEqual(
    travel?.types.slice(0, 3).map((type) => type.label),
    ["Travel agency", "Tour operator", "Hotel/Homestay"],
  );
  for (const category of BUSINESS_CATEGORIES) {
    assert.equal(category.types.some((type) => type.custom && type.label === "Other (type it)"), true, category.label);
  }
  const fitness = JSON.stringify(BUSINESS_CATEGORIES.find((category) => category.id === "fitness")).toLowerCase();
  assert.match(fitness, /gym/);
  assert.match(fitness, /yoga studio/);
  assert.match(fitness, /fitness coach/);
  assert.doesNotMatch(fitness, /clinic|doctor|hospital|patient|medical|medicine|diagnos/);
  const picked = validateBusinessSelection({ category: "travel", businessType: "other", customType: "Houseboat stays" });
  assert.equal(picked.ok, true);
  if (picked.ok) assert.equal(picked.value.customType, "Houseboat stays");
  assert.equal(showsCustomType({ category: "travel", businessType: "hotel", customType: "" }), false);
  assert.equal(showsCustomType({ category: "travel", businessType: "other", customType: "" }), true);
});

test("team filter, search and sort keep pinned, then on, then off", () => {
  const cards = [
    { id: "a", name: "Ayaan", role: "AI CEO", pinned: true, enabled: false, recommended: true, needsYou: false, sortOrder: 2 },
    { id: "b", name: "Mira", role: "Posts and Reels", pinned: false, enabled: true, recommended: false, needsYou: true, sortOrder: 4 },
    { id: "c", name: "Zoya", role: "Customer replies", pinned: true, enabled: true, recommended: false, needsYou: false, sortOrder: 1 },
    { id: "d", name: "Dev", role: "Google listing", pinned: false, enabled: false, recommended: true, needsYou: false, sortOrder: 1 },
    { id: "e", name: "Neha", role: "Email and WhatsApp", pinned: false, enabled: true, recommended: true, needsYou: false, sortOrder: 2 },
  ];
  assert.deepEqual(
    sortTeam(cards).map((card) => card.id),
    ["c", "a", "e", "b", "d"],
  );
  assert.deepEqual(
    filterTeam(cards, "on", "").map((card) => card.name),
    ["Mira", "Zoya", "Neha"],
  );
  assert.deepEqual(
    filterTeam(cards, "picked", "dev").map((card) => card.id),
    ["d"],
  );
  assert.deepEqual(
    filterTeam(cards, "needs", "reel").map((card) => card.id),
    ["b"],
  );
  assert.equal(filterTeam(cards, "all", "missing").length, 0);
  assert.equal(summaryLine(teamSummary(cards)), "3 on · 1 needs you");
  assert.equal(summaryLine({ on: 12, needs: 3 }), "12 on · 3 need you");
});

test("chat list groups pinned and needs-you first, and a missing key does not add a reply", () => {
  const agents = [
    { id: "1", name: "Arjun", role: "Campaign planner", pinned: false, needsYou: false },
    { id: "2", name: "Rohan", role: "Ads watcher", pinned: false, needsYou: true },
    { id: "3", name: "Mira", role: "Posts and Reels", pinned: true, needsYou: true },
    { id: "4", name: "Zoya", role: "Customer replies", pinned: true, needsYou: false },
  ];
  const groups = groupChatAgents(agents, "");
  assert.deepEqual(groups.pinned.map((agent) => agent.name), ["Mira", "Zoya"]);
  assert.deepEqual(groups.needs.map((agent) => agent.name), ["Rohan"]);
  assert.deepEqual(groups.rest.map((agent) => agent.name), ["Arjun"]);
  assert.deepEqual(groupChatAgents(agents, "ads").needs.map((agent) => agent.id), ["2"]);
  assert.equal(composerState({ text: "", busy: false, hasKey: true }).disabled, true);
  assert.equal(composerState({ text: "Hello", busy: true, hasKey: true }).reason, "busy");
  assert.equal(composerState({ text: "Hello", busy: false, hasKey: false }).reason, "nokey");
  assert.equal(composerState({ text: "Hello", busy: false, hasKey: true }).disabled, false);
  const history = [{ role: "agent", body: "Earlier note" }];
  assert.deepEqual(messagesAfterSend(history, "Hello", false), history);
  assert.equal(messagesAfterSend(history, "Hello", true).some((message) => message.body === "Hello" && message.role === "user"), true);
  assert.equal(chatHasUsableKey(false, false), false);
  assert.equal(chatHasUsableKey(false, true), true);
  assert.equal(chatHasUsableKey(true, false), true);
});

test("chat answers with a platform key and stores nothing when no key exists", async () => {
  const email = `chat-${Date.now()}@shop.test`;
  const user = await prisma.user.create({
    data: { email, compAccess: true, onboardedAt: new Date(), businessName: "Northwind Holidays" },
  });
  await prisma.userAgent.create({ data: { userId: user.id, agentId: "mira", enabled: true } });
  const token = randomToken();
  await prisma.session.create({
    data: { tokenHash: hashSecret(token), email, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const previousPlatform = process.env.LLM_API_KEY;
  const previousOpenAi = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  delete process.env.LLM_API_KEY;
  delete process.env.OPENAI_API_KEY;

  function send(text: string) {
    return chat(
      new Request("http://localhost/api/dashboard/chat", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `ai_time_machine_session=${token}` },
        body: JSON.stringify({ agentId: "mira", text }),
      }),
    );
  }

  try {
    const none = await send("Hello");
    assert.equal(none.status, 409);
    const noneBody = (await none.json()) as { needsKey?: boolean; reply?: string };
    assert.equal(noneBody.needsKey, true);
    assert.equal(noneBody.reply, undefined);
    assert.equal(await prisma.message.count({ where: { userId: user.id } }), 0);

    process.env.LLM_API_KEY = "sk-test-platform";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      assert.match(String(input), /chat\/completions/);
      return new Response(JSON.stringify({ choices: [{ message: { content: "Platform reply." } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const withPlatform = await send("Hello");
    assert.equal(withPlatform.status, 200);
    const body = (await withPlatform.json()) as { reply?: string };
    assert.equal(body.reply, "Platform reply.");
    const stored = await prisma.message.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(stored.map((message) => message.body), ["Hello", "Platform reply."]);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousPlatform === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = previousPlatform;
    if (previousOpenAi === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAi;
    await prisma.message.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.userAgent.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("prompts use the category and never leak everyday work", () => {
  const empty = buildSystemPrompt(agent, { businessName: "My business", sells: "everyday work" });
  assert.doesNotMatch(empty, /everyday work/i);
  assert.doesNotMatch(empty, /For My business \(everyday work\)/);
  assert.match(empty, /The business is called My business/);
  const blank = buildSystemPrompt(agent, {});
  assert.doesNotMatch(blank, /everyday work|not set yet|what you do|For My business/i);
  assert.match(blank, /Speak in a general way/);
  const travel = buildSystemPrompt(agent, { businessName: "Northwind Holidays", category: "travel", businessType: "hotel" });
  assert.match(travel, /Travel & Tourism: Hotel\/Homestay/);
  assert.equal(workLabel({ sells: "tour packages" }), "tour packages");
  assert.equal(businessPromptLine({ sells: "everyday work" }), "Business details are not filled in. Speak in a general way. Do not invent a business name or a line of work.");
});

test("save button states", () => {
  assert.deepEqual(saveButtonState(false, "idle"), { label: "Save changes", disabled: true });
  assert.deepEqual(saveButtonState(true, "idle"), { label: "Save changes", disabled: false });
  assert.deepEqual(saveButtonState(true, "saving"), { label: "Saving…", disabled: true });
  assert.deepEqual(saveButtonState(false, "saved"), { label: "Saved", disabled: true });
  assert.deepEqual(saveButtonState(true, "error"), { label: "Could not save", disabled: false });
});
