import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as apply } from "../app/api/creators/apply/route";
import { GET as exportCsv } from "../app/api/admin/creators.csv/route";
import { PATCH as patchCreator } from "../app/api/admin/creators/[id]/route";
import { hashSecret, randomToken } from "../lib/crypto";
import { CREATOR_APPS } from "../lib/creators/apps";
import { looksLikeTest, parseApplication } from "../lib/creators/input";
import { prisma } from "../lib/prisma";
import { publicPages } from "../lib/public-pages";

if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret";

const ADMIN = "creator-admin@example.com";
const EMAIL = "samayhuf+creatortest@example.com";
const BASE = "http://localhost:3000";

function req(path: string, method: string, body?: unknown, cookie?: string, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    host: "localhost:3000",
    "x-forwarded-for": `10.22.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
    ...extra,
  };
  if (cookie) headers.cookie = cookie;
  return new Request(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

const APPLICATION = {
  name: "Test Creator",
  email: EMAIL,
  phone: "+14155552671",
  country: "United States",
  platform: "instagram",
  profileUrls: "instagram.com/test.creator",
  followerRange: "10k–50k",
  niche: "Business",
  contentTypes: ["reels", "ugc"],
  languages: "English, Hindi",
  rateType: "paid",
  rateNote: "Open to discuss",
  sampleLinks: "https://instagram.com/reel/example",
  note: "[TEST] Internal QA application — please ignore.",
  selectedApps: ["ai-time-machine", "sozal", "playsz"],
  consent: true,
};

async function adminCookie() {
  process.env.ADMIN_EMAILS = ADMIN;
  const token = randomToken();
  const user = await prisma.user.upsert({ where: { email: ADMIN }, update: {}, create: { email: ADMIN, compAccess: true, onboardedAt: new Date() } });
  await prisma.session.create({ data: { tokenHash: hashSecret(token), email: ADMIN, userId: user.id, isAdmin: true, expiresAt: new Date(Date.now() + 3600_000) } });
  return `ai_time_machine_session=${token}`;
}

async function cleanup() {
  await prisma.creatorApplication.deleteMany({ where: { email: { contains: "creatortest" } } });
  await prisma.rateLimit.deleteMany({ where: { id: { startsWith: "creators:" } } });
}

test("creator catalog includes the live apps and public route", () => {
  const names = CREATOR_APPS.map((app) => app.name);
  for (const needed of [
    "AI Time Machine",
    "Sozal",
    "Playsz",
    "Klenzer",
    "Clean Inbox",
    "Ramayan: Watch & Talk",
    "Mahabharat",
    "2 Patti",
    "Klarity",
    "Scanwise",
    "Twist 21",
    "Lulla",
    "45 Days Abs Challenge",
    "Momentum Men's Workout",
    "Momentum Women's Workout",
    "Krosz",
    "Chezz",
  ]) {
    assert.ok(names.includes(needed), needed);
  }
  assert.ok(publicPages().includes("/creators"));
  const page = fs.readFileSync(path.join(process.cwd(), "app/creators/page.tsx"), "utf8");
  assert.match(page, /does not guarantee paid work/);
  assert.doesNotMatch(page, /powered by AI|guaranteed payment|we will pay/i);
});

test("parseApplication validates fields and flags test notes", () => {
  assert.equal(looksLikeTest("Priya", "priya@example.com", null), false);
  assert.equal(looksLikeTest("Priya", EMAIL, "[TEST] hi"), true);
  const parsed = parseApplication(APPLICATION);
  assert.equal(parsed.email, EMAIL);
  assert.equal(parsed.isTest, true);
  assert.equal(parsed.profileUrls[0], "https://instagram.com/test.creator");
  assert.deepEqual(parsed.selectedApps, ["ai-time-machine", "sozal", "playsz"]);
  assert.throws(() => parseApplication({ ...APPLICATION, consent: false }), /agree/);
  assert.throws(() => parseApplication({ ...APPLICATION, selectedApps: [] }), /app/i);
  assert.throws(() => parseApplication({ ...APPLICATION, selectedApps: ["not-an-app"] }), /valid app/i);
  assert.throws(() => parseApplication({ ...APPLICATION, profileUrls: "" }), /Profile URL/);
  assert.throws(() => parseApplication({ ...APPLICATION, phone: "123" }), /phone/);
});

test("apply API stores a multi-app test submission, blocks honeypots, and exports CSV", async () => {
  await cleanup();
  const honeypot = await apply(req("/api/creators/apply", "POST", { ...APPLICATION, website: "https://spam.test" }));
  assert.equal(honeypot.status, 200);
  assert.equal(await prisma.creatorApplication.count({ where: { email: EMAIL } }), 0);

  const missing = await apply(req("/api/creators/apply", "POST", { ...APPLICATION, consent: false }));
  assert.equal(missing.status, 400);

  const created = await apply(req("/api/creators/apply", "POST", APPLICATION));
  assert.equal(created.status, 201, await created.clone().text());
  const row = await prisma.creatorApplication.findFirst({ where: { email: EMAIL } });
  assert.ok(row);
  assert.equal(row!.isTest, true);
  assert.equal(row!.status, "new");
  assert.ok(row!.selectedApps.includes("sozal"));
  assert.equal(row!.country, "United States");

  const denied = await exportCsv(req("/api/admin/creators.csv", "GET"));
  assert.equal(denied.status, 401);

  const cookie = await adminCookie();
  const csv = await exportCsv(req("/api/admin/creators.csv", "GET", undefined, cookie));
  assert.equal(csv.status, 200);
  const body = await csv.text();
  assert.match(body, /AI Time Machine/);
  assert.match(body, /samayhuf\+creatortest@example.com/);

  const patched = await patchCreator(req(`/api/admin/creators/${row!.id}`, "PATCH", { status: "reviewed" }, cookie), { params: Promise.resolve({ id: row!.id }) });
  assert.equal(patched.status, 200, await patched.clone().text());
  const after = await prisma.creatorApplication.findUnique({ where: { id: row!.id } });
  assert.equal(after!.status, "reviewed");
  await cleanup();
});
