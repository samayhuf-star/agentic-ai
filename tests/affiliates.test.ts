import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { hashSecret, randomToken } from "../lib/crypto";
import { POST as apply } from "../app/api/partners/apply/route";
import { PATCH as patchAffiliate } from "../app/api/admin/affiliates/[id]/route";
import { POST as adminAddPost } from "../app/api/admin/affiliates/[id]/posts/route";
import { PATCH as adminPatchPost } from "../app/api/admin/posts/[id]/route";
import { POST as partnerAddPost } from "../app/api/partner/[token]/posts/route";
import { PATCH as partnerPatchPost } from "../app/api/partner/[token]/posts/[postId]/route";
import { PUT as partnerPayout } from "../app/api/partner/[token]/payout/route";
import { POST as createPayment } from "../app/api/admin/payments/route";
import { PATCH as patchPayment } from "../app/api/admin/payments/[id]/route";
import { GET as refClick } from "../app/r/[code]/route";
import { maskedName, parseHidden, salesFeed, serializeHidden } from "../lib/affiliates/dashboard";
import { maskedSummary, openPayout, readPayout, sealPayout } from "../lib/affiliates/payout";
import { socialUrl } from "../lib/affiliates/social";
import { decodeRefCookie, encodeRefCookie } from "../lib/affiliates/core";

if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret";
if (!process.env.ENCRYPTION_KEY) process.env.ENCRYPTION_KEY = "a".repeat(64);

const ADMIN = "aff-admin@example.com";
const APPLICANT = "aff-applicant@example.com";
const BUYER = "aff-buyer@example.com";
const BASE = "http://localhost:3000";

function req(path: string, method: string, body?: unknown, cookie?: string, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", host: "localhost:3000", "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...extra };
  if (cookie) headers.cookie = cookie;
  return new Request(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function adminCookie() {
  process.env.ADMIN_EMAILS = ADMIN;
  const token = randomToken();
  const user = await prisma.user.upsert({ where: { email: ADMIN }, update: {}, create: { email: ADMIN, compAccess: true, onboardedAt: new Date() } });
  await prisma.session.create({ data: { tokenHash: hashSecret(token), email: ADMIN, userId: user.id, isAdmin: true, expiresAt: new Date(Date.now() + 3600_000) } });
  return `ai_time_machine_session=${token}`;
}

async function cleanup() {
  const aff = await prisma.affiliate.findMany({ where: { email: APPLICANT } });
  for (const a of aff) {
    await prisma.payment.updateMany({ where: { affiliateId: a.id }, data: { affiliateId: null } });
    await prisma.affiliate.delete({ where: { id: a.id } });
  }
  await prisma.payment.deleteMany({ where: { email: BUYER } });
  await prisma.user.deleteMany({ where: { email: BUYER } });
}

const APPLICATION = {
  name: "Priya Creator",
  email: APPLICANT,
  phone: "9876543210",
  city: "Mumbai",
  instagramUrl: "instagram.com/priya.creates",
  tiktokUrl: "",
  followers: "12k",
  niche: "Marketing",
  pitch: "Reels about running a small business with AI.",
  terms: true,
};

test("helpers: social hosts, payout confirm/encrypt/mask, names, hidden blocks, cookie", () => {
  assert.equal(socialUrl("instagram.com/abc", "IG", ["instagram"]), "https://instagram.com/abc");
  assert.throws(() => socialUrl("https://evil.com/instagram.com", "IG", ["instagram"]), /instagram/);
  assert.throws(() => socialUrl("https://www.tiktok.com/@x", "IG", ["instagram"]));
  assert.throws(() => readPayout({ upiId: "sam@okaxis", upiIdConfirm: "sam@okicici", holderName: "Sam" }), /do not match/);
  assert.throws(() => readPayout({ upiId: "not-upi", upiIdConfirm: "not-upi", holderName: "Sam" }), /name@bank/);
  assert.throws(() => readPayout({ bankAccount: "123456789012", bankAccountConfirm: "123456789012", bankIfsc: "BAD", holderName: "Sam" }), /IFSC/);
  const d = readPayout({ upiId: "Samay@okaxis", upiIdConfirm: "samay@okaxis", holderName: "Samay V", bankAccount: "123456781234", bankAccountConfirm: "123456781234", bankIfsc: "hdfc0001234", bankName: "HDFC" })!;
  assert.equal(maskedSummary(d), "UPI sam***@okaxis · HDFC A/c ****1234 (HDFC) — Samay");
  const sealed = sealPayout(d);
  assert.ok(!sealed.includes("okaxis") && !sealed.includes("1234567"));
  assert.deepEqual(openPayout(sealed), d);
  assert.equal(readPayout({}, { optional: true }), null);
  assert.equal(maskedName("Deepak Sharma", null), "Deepak ****");
  assert.equal(maskedName("deepak", null), "Deepak");
  assert.equal(maskedName(null, "sam@gmail.com"), "s***@gmail.com");
  assert.deepEqual([...parseHidden("feed,bogus,clicks")].sort(), ["clicks", "feed"]);
  assert.equal(serializeHidden(["content", "x", "content"]), "content");
  const ref = decodeRefCookie(encodeRefCookie("PRIYA", "ckabcdefghij", "ckpostabcdef"));
  assert.equal(ref?.postId, "ckpostabcdef");
});

test("apply → pending gating → approve → tracking, posts, payout, feed", async () => {
  await cleanup();
  const admin = await adminCookie();

  // Validation: needs a social link, real host, terms.
  assert.equal((await apply(req("/api/partners/apply", "POST", { ...APPLICATION, instagramUrl: "" }))).status, 400);
  assert.equal((await apply(req("/api/partners/apply", "POST", { ...APPLICATION, instagramUrl: "https://instagrarn.com/x" }))).status, 400);
  assert.equal((await apply(req("/api/partners/apply", "POST", { ...APPLICATION, terms: false }))).status, 400);
  assert.equal((await apply(req("/api/partners/apply", "POST", APPLICATION, undefined, { origin: "https://evil.example" }))).status, 403);

  const res = await apply(req("/api/partners/apply", "POST", { ...APPLICATION, payout: { upiId: "priya@okhdfc", upiIdConfirm: "priya@okhdfc", holderName: "Priya C" } }));
  assert.equal(res.status, 201);
  const body = (await res.json()) as { dashboardUrl: string };
  const token = body.dashboardUrl.split("/partner/")[1];
  const a = await prisma.affiliate.findUniqueOrThrow({ where: { token } });
  assert.equal(a.status, "pending");
  assert.equal(a.followers, 12000);
  assert.equal(a.payoutMasked, "UPI pri***@okhdfc — Priya");
  assert.ok(a.payoutEnc && !a.payoutEnc.includes("priya"));

  // Re-applying never shows the token on screen.
  const again = await apply(req("/api/partners/apply", "POST", APPLICATION));
  const againBody = (await again.json()) as Record<string, unknown>;
  assert.equal(againBody.existing, true);
  assert.equal(againBody.dashboardUrl, undefined);

  // Pending: link does not attribute, creator cannot add posts.
  const pendingClick = await refClick(req(`/r/${a.code}?to=/55-ai-agents`, "GET"), { params: Promise.resolve({ code: a.code }) });
  assert.ok([302, 307].includes(pendingClick.status));
  assert.ok(!(pendingClick.headers.get("set-cookie") || "").includes("aitm_ref"));
  assert.equal(await prisma.affiliateClick.count({ where: { affiliateId: a.id } }), 0);
  const tp = (t: string) => ({ params: Promise.resolve({ token: t }) });
  assert.equal((await partnerAddPost(req(`/api/partner/${token}/posts`, "POST", { url: "https://www.instagram.com/reel/abc" }), tp(token))).status, 403);
  assert.equal((await partnerAddPost(req(`/api/partner/nope-not-a-real-token-xx/posts`, "POST", {}), tp("nope-not-a-real-token-xx"))).status, 404);

  // Approve requires an admin.
  const ap = { params: Promise.resolve({ id: a.id }) };
  assert.equal((await patchAffiliate(req(`/api/admin/affiliates/${a.id}`, "PATCH", { action: "approve" }), ap)).status, 401);
  assert.equal((await patchAffiliate(req(`/api/admin/affiliates/${a.id}`, "PATCH", { action: "approve" }, admin), { params: Promise.resolve({ id: a.id }) })).status, 200);
  assert.equal((await prisma.affiliate.findUniqueOrThrow({ where: { id: a.id } })).status, "active");

  // Posts: creator adds, per-post click is tracked.
  const added = await partnerAddPost(req(`/api/partner/${token}/posts`, "POST", { url: "https://www.instagram.com/reel/abc123/", views: "1,200", likes: 80 }), tp(token));
  assert.equal(added.status, 201);
  const { id: postId } = (await added.json()) as { id: string };
  assert.equal((await partnerAddPost(req(`/api/partner/${token}/posts`, "POST", { url: "https://example.com/x" }), tp(token))).status, 400);
  const click = await refClick(req(`/r/${a.code}?to=/55-ai-agents&p=${postId}`, "GET"), { params: Promise.resolve({ code: a.code }) });
  assert.ok((click.headers.get("set-cookie") || "").includes("aitm_ref"));
  assert.equal(await prisma.affiliateClick.count({ where: { affiliateId: a.id, postId } }), 1);

  // Admin locks the post: creator can no longer edit it.
  const pp = { params: Promise.resolve({ token, postId }) };
  assert.equal((await partnerPatchPost(req(`/api/partner/${token}/posts/${postId}`, "PATCH", { views: 5000 }), pp)).status, 200);
  assert.equal((await adminPatchPost(req(`/api/admin/posts/${postId}`, "PATCH", { locked: true, verified: true }, admin), { params: Promise.resolve({ id: postId }) })).status, 200);
  assert.equal((await partnerPatchPost(req(`/api/partner/${token}/posts/${postId}`, "PATCH", { views: 9_999_999 }), { params: Promise.resolve({ token, postId }) })).status, 403);
  assert.equal((await prisma.affiliatePost.findUniqueOrThrow({ where: { id: postId } })).views, 5000);
  assert.equal((await adminAddPost(req(`/api/admin/affiliates/${a.id}/posts`, "POST", { url: "https://www.tiktok.com/@p/video/1" }, admin), { params: Promise.resolve({ id: a.id }) })).status, 201);

  // Creator changes payout: confirm must match; change is flagged for admin.
  assert.equal((await partnerPayout(req(`/api/partner/${token}/payout`, "PUT", { upiId: "x@ybl", upiIdConfirm: "y@ybl", holderName: "P" }), tp(token))).status, 400);
  assert.equal((await partnerPayout(req(`/api/partner/${token}/payout`, "PUT", { upiId: "priya2@ybl", upiIdConfirm: "priya2@ybl", holderName: "Priya C" }), tp(token))).status, 200);
  const changed = await prisma.affiliate.findUniqueOrThrow({ where: { id: a.id } });
  assert.equal(changed.payoutCheckedAt, null);
  assert.equal(changed.payoutUpdatedBy, "creator");
  assert.ok(await prisma.adminAudit.findFirst({ where: { entityId: a.id, action: "affiliate.payout" } }));

  // A sale through the code: feed shows masked name + city; refund reverses.
  const buyer = await prisma.user.create({ data: { email: BUYER, name: "Deepak Sharma", city: "Delhi" } });
  const pay = await createPayment(req("/api/admin/payments", "POST", { customerId: buyer.id, amount: 1999, status: "paid", method: "upi", affiliateCode: a.code }, admin));
  assert.equal(pay.status, 201);
  const { id: paymentId } = (await pay.json()) as { id: string };
  let feed = await salesFeed(a.id);
  assert.equal(feed.length, 1);
  assert.equal(`${feed[0].who}, ${feed[0].city} — ${feed[0].sale} — ${feed[0].commission}`, "Deepak ****, Delhi — Sale completed — your commission pending ₹400");
  await prisma.affiliateCommission.updateMany({ where: { paymentId }, data: { status: "approved" } });
  feed = await salesFeed(a.id);
  assert.equal(feed[0].commission, "your commission confirmed ₹400");
  assert.equal((await patchPayment(req(`/api/admin/payments/${paymentId}`, "PATCH", { status: "refunded" }, admin), { params: Promise.resolve({ id: paymentId }) })).status, 200);
  feed = await salesFeed(a.id);
  assert.equal(feed[0].sale, "Sale refunded");
  assert.equal(feed[0].commission, "your commission reversed ₹400");

  await cleanup();
});
