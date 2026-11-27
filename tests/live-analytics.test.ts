import assert from "node:assert/strict";
import test from "node:test";
import { GET as liveRoute } from "../app/api/admin/analytics/live/route";
import { hashSecret, randomToken } from "../lib/crypto";
import { liveAnalytics, percentOf, readLiveRange } from "../lib/admin/live-analytics";
import { prisma } from "../lib/prisma";

if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret";

const NOW = new Date("2019-06-14T12:00:00.000Z");
const EMAIL = "live-analytics-buyer@not-internal.example";
const PAYMENT = "liveanpay00000001";

async function cleanup() {
  await prisma.systemEvent.deleteMany({
    where: { OR: [{ dedupeKey: { startsWith: "livean:" } }, { dedupeKey: { startsWith: "visit:livean" } }, { dedupeKey: { startsWith: "inapp_browser_prompt:visit:livean" } }, { email: EMAIL }] },
  });
  await prisma.marketingVisit.deleteMany({ where: { id: { startsWith: "livean" } } });
  await prisma.payment.deleteMany({ where: { id: PAYMENT } });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
}

test("live range defaults to 7 days and hides admin and test rows", () => {
  const range = readLiveRange({});
  assert.equal(range.key, "7d");
  assert.equal(range.includeTagged, false);
  assert.equal(range.bucket, "day");
  assert.equal(percentOf(1, 5), 20);
  assert.equal(percentOf(0, 0), null);
  const today = readLiveRange({ range: "today" });
  assert.equal(today.bucket, "hour");
  const broken = readLiveRange({ range: "custom", from: "nope" });
  assert.equal(broken.key, "7d");
});

test("live analytics matches the activity log and excludes admin and test rows", async () => {
  await cleanup();
  const day = readLiveRange({ range: "custom", from: "2019-06-14", to: "2019-06-14" });
  const before = await prisma.systemEvent.count({ where: { createdAt: { gte: day.from, lte: day.to } } });
  assert.equal(before, 0, "the sample day should be empty before the fixture");

  const user = await prisma.user.create({ data: { email: EMAIL, city: "Pune" } });
  await prisma.payment.create({
    data: { id: PAYMENT, gateway: "cashfree", amountInr: 1999, status: "pending", email: EMAIL, userId: user.id, device: "desktop/other/browser" },
  });
  await prisma.marketingVisit.createMany({
    data: [
      { id: "liveanvisit1", visitorId: "livean-visitor-a", path: "/", source: "Instagram Ads", channel: "Paid Meta", campaign: "52557" },
      { id: "liveanvisit2", visitorId: "livean-visitor-a", path: "/pricing", source: "Instagram Ads", channel: "Paid Meta", campaign: "52557" },
      { id: "liveanvisit3", visitorId: "livean-visitor-a", path: "/", source: "Instagram Ads", channel: "Paid Meta", campaign: "52557" },
      { id: "liveanvisit4", visitorId: "livean-visitor-d", path: "/checkout", source: "Direct", channel: "Direct" },
    ],
  });

  const at = (msAgo: number) => new Date(NOW.getTime() - msAgo);
  await prisma.systemEvent.createMany({
    data: [
      { type: "visit", createdAt: at(2 * 60 * 1000), source: "Instagram Ads", status: "Paid Meta", summary: "Visited / from Instagram Ads", detail: "Campaign 52557", dedupeKey: "visit:liveanvisit1" },
      { type: "visit", createdAt: at(20 * 60 * 1000), source: "Instagram Ads", status: "Paid Meta", summary: "Visited /pricing from Instagram Ads", detail: "Campaign 52557", dedupeKey: "visit:liveanvisit2" },
      { type: "visit", createdAt: at(2 * 60 * 60 * 1000), source: "Instagram Ads", status: "Paid Meta", summary: "Visited / from Instagram Ads", detail: "Campaign 52557", dedupeKey: "visit:liveanvisit3" },
      { type: "visit", createdAt: at(90 * 60 * 1000), source: "Direct", status: "Direct", summary: "Visited /checkout from Direct", dedupeKey: "visit:liveanvisit4" },
      { type: "visit", createdAt: at(3 * 60 * 60 * 1000), source: "Google organic", status: "Organic search", summary: "Visited /blog/from-the-team from Google organic", dedupeKey: "livean:summary-legal" },
      { type: "visit", createdAt: at(10 * 60 * 1000), source: "Direct", summary: "Visited /admin from Direct", tag: "admin", dedupeKey: "visit:liveanvisitadmin" },
      { type: "visit", createdAt: at(40 * 60 * 1000), source: "Direct", summary: "Visited /test from Direct", tag: "test", dedupeKey: "livean:test-visit" },
      { type: "inapp_browser_prompt", createdAt: at(2 * 60 * 1000), source: "Instagram Ads", status: "instagram", summary: "In-app browser prompt (instagram) on /", detail: "mobile/android/instagram-app", dedupeKey: "inapp_browser_prompt:visit:liveanvisit1" },
      { type: "signup", createdAt: at(15 * 60 * 1000), email: EMAIL, userId: user.id, summary: `Account created for ${EMAIL}`, dedupeKey: "livean:signup" },
      { type: "checkout", createdAt: at(14 * 60 * 1000), email: EMAIL, userId: user.id, paymentId: PAYMENT, amountInr: 1999, status: "started", source: "Instagram Ads", summary: `Checkout ${PAYMENT}`, dedupeKey: "livean:checkout" },
      { type: "payment.paid", createdAt: at(13 * 60 * 1000), email: EMAIL, userId: user.id, paymentId: PAYMENT, amountInr: 1999, status: "paid", source: "Instagram Ads", summary: `Paid ${PAYMENT}`, dedupeKey: "livean:paid" },
      { type: "email.sent", createdAt: at(60 * 1000), email: EMAIL, summary: "Email sent", dedupeKey: "livean:email" },
      { type: "webhook", createdAt: at(60 * 1000), summary: "Webhook", dedupeKey: "livean:webhook" },
    ],
  });

  try {
    const snap = await liveAnalytics(day, NOW);
    const visitWhere = { type: "visit", tag: null as string | null, createdAt: { gte: day.from, lte: day.to } };
    const activityVisits = await prisma.systemEvent.count({ where: visitWhere });
    const activitySignups = await prisma.systemEvent.count({ where: { type: "signup", tag: null, createdAt: { gte: day.from, lte: day.to } } });
    const activityCheckouts = await prisma.systemEvent.count({ where: { type: "checkout", tag: null, createdAt: { gte: day.from, lte: day.to } } });
    const paid = await prisma.systemEvent.aggregate({
      where: { type: "payment.paid", tag: null, createdAt: { gte: day.from, lte: day.to } },
      _sum: { amountInr: true },
      _count: true,
    });

    assert.equal(snap.totals.pageViews, activityVisits);
    assert.equal(activityVisits, 5);
    assert.equal(snap.totals.visitors, 3);
    assert.equal(snap.totals.sessions, 4);
    assert.equal(snap.series.reduce((sum, point) => sum + point.pageViews, 0), activityVisits);
    assert.equal(snap.series.reduce((sum, point) => sum + point.sessions, 0), 4);
    assert.ok(snap.series.some((point) => point.bucket === "2019-06-14 15:00" && point.pageViews >= 1));

    assert.equal(snap.funnel.find((step) => step.label === "Signup")?.events, activitySignups);
    assert.equal(activitySignups, 1);
    assert.equal(snap.funnel.find((step) => step.label === "Checkout started")?.events, activityCheckouts);
    assert.equal(activityCheckouts, 1);
    assert.equal(snap.funnel.find((step) => step.label === "Payment success")?.events, paid._count);
    assert.equal(snap.revenueInr, paid._sum.amountInr);
    assert.equal(snap.revenueInr, 1999);
    assert.equal(snap.refundedInr, 0);
    assert.equal(snap.funnel.find((step) => step.label === "Signup")?.ofVisits, 20);

    assert.deepEqual(
      snap.sources.find((row) => row.label === "Instagram Ads"),
      { label: "Instagram Ads", pageViews: 3, visitors: 1 },
    );
    assert.deepEqual(snap.campaigns[0], { label: "52557", pageViews: 3, visitors: 1 });
    assert.equal(snap.pages.find((row) => row.label === "/")?.pageViews, 2);
    assert.equal(snap.pages.find((row) => row.label === "/blog/from-the-team")?.pageViews, 1);
    assert.deepEqual(snap.inApp, [{ label: "instagram", events: 1 }]);
    assert.ok(snap.devices.some((row) => row.label === "mobile/android/instagram-app" && row.events === 1));
    assert.ok(snap.devices.some((row) => row.label === "desktop/other/browser" && row.events === 1));
    assert.deepEqual(snap.cities, [{ label: "Pune", people: 1 }]);

    assert.equal(snap.realtime.active5, 1);
    assert.equal(snap.realtime.active30, 2);
    assert.ok(snap.realtime.minutes.length >= 30);
    assert.equal(snap.realtime.minutes.reduce((sum, minute) => sum + minute.users, 0) >= 2, true);

    const withStaff = await liveAnalytics({ ...day, includeTagged: true }, NOW);
    const everyone = await prisma.systemEvent.count({ where: { type: "visit", createdAt: { gte: day.from, lte: day.to } } });
    assert.equal(withStaff.totals.pageViews, everyone);
    assert.equal(everyone, 7);
    assert.equal(withStaff.realtime.active30, 3);
  } finally {
    await cleanup();
  }
});

test("the live analytics API requires an admin session and matches the activity count", async () => {
  const prev = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "live-api-admin@example.com";
  const email = "live-api-admin@example.com";
  try {
    const denied = await liveRoute(new Request("http://localhost:3000/api/admin/analytics/live?range=custom&from=2019-06-14&to=2019-06-14"));
    assert.equal(denied.status, 401);
    const token = randomToken();
    const user = await prisma.user.create({ data: { email, compAccess: true, onboardedAt: new Date() } });
    await prisma.session.create({
      data: { tokenHash: hashSecret(token), email, userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
    });
    await prisma.systemEvent.create({
      data: { type: "visit", createdAt: new Date("2019-06-14T10:00:00.000Z"), source: "Direct", summary: "Visited / from Direct", dedupeKey: "livean:api-visit" },
    });
    const response = await liveRoute(
      new Request("http://localhost:3000/api/admin/analytics/live?range=custom&from=2019-06-14&to=2019-06-14", {
        headers: { cookie: `ai_time_machine_session=${token}` },
      }),
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as { totals: { pageViews: number } };
    const range = readLiveRange({ range: "custom", from: "2019-06-14", to: "2019-06-14" });
    const activityVisits = await prisma.systemEvent.count({
      where: { type: "visit", tag: null, createdAt: { gte: range.from, lte: range.to } },
    });
    assert.equal(body.totals.pageViews, activityVisits);
    assert.equal(activityVisits, 1);
  } finally {
    if (prev == null) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prev;
    await prisma.systemEvent.deleteMany({ where: { dedupeKey: "livean:api-visit" } });
    await prisma.session.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email } });
  }
});
