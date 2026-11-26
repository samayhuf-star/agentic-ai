import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { createCheckout } from "../lib/payments/checkout";
import { handleWebhook } from "../lib/payments/webhook";
import { mockSignature } from "../lib/payments/signature";
import { channelOf, decodeMarketing, encodeMarketing, mergeTouch, MT_COOKIE, sourceFromStored, sourceOf, touchFromRequest } from "../lib/marketing/touch";
import { salesBySource, toCsv } from "../lib/marketing/report";

if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret";
delete process.env.RESEND_API_KEY;
const OWN = ["www.theaitimemachine.com"];
const t = (url: string, ref: string | null = null) => touchFromRequest(new URL(url), ref, OWN);

test("channel rules", () => {
  assert.equal(channelOf(t("https://www.theaitimemachine.com/?fbclid=abc")), "Paid Meta");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/?utm_source=instagram&utm_medium=cpc")), "Paid Meta");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/?gclid=x")), "Paid Google");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/?utm_source=google&utm_medium=cpc")), "Paid Google");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/?ref=PRIYA")), "Affiliate");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/", "https://www.google.co.in/")), "Organic search");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/", "https://l.instagram.com/")), "Social organic");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/?utm_source=newsletter&utm_medium=email")), "Email");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/", "https://someblog.in/post")), "Referral");
  assert.equal(channelOf(null), "Direct");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/?gclid=x"), { affiliate: true }), "Affiliate");
  assert.equal(t("https://www.theaitimemachine.com/a", "https://www.theaitimemachine.com/b"), null);
  // First touch sticks; last touch moves only on a new signal.
  const first = mergeTouch(null, t("https://www.theaitimemachine.com/?utm_source=google&utm_medium=cpc"), "/")!;
  assert.equal(mergeTouch(first, null, "/x"), null);
  const next = mergeTouch(first, t("https://www.theaitimemachine.com/?fbclid=zz"), "/")!;
  assert.equal(next.f.s, "google");
  assert.equal(next.l.f, "zz");
  assert.deepEqual(decodeMarketing(encodeMarketing(next)), decodeMarketing(encodeMarketing(decodeMarketing(encodeMarketing(next))!)));
  assert.equal(decodeMarketing("garbage!!"), null);
  assert.equal(toCsv([["=cmd", 'a"b']]), `'=cmd,"a""b"`);

  assert.equal(sourceOf(t("https://www.theaitimemachine.com/?gclid=x")), "Google Ads");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/?gbraid=x")), "Google Ads");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/?wbraid=x")), "Google Ads");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/?fbclid=abc&utm_source=instagram")), "Instagram Ads");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/?fbclid=abc")), "Facebook Ads");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/?ttclid=x")), "TikTok Ads");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/?li_fat_id=x")), "LinkedIn Ads");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/", "https://www.google.co.in/")), "Google organic");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/", "https://www.bing.com/search")), "Bing");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/", "https://l.instagram.com/")), "Instagram organic");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/", "https://www.facebook.com/")), "Facebook organic");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/", "https://youtu.be/abc")), "YouTube");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/", "https://www.linkedin.com/feed")), "LinkedIn");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/", "https://x.com/u")), "X");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/", "https://wa.me/91")), "WhatsApp");
  assert.equal(sourceOf(t("https://www.theaitimemachine.com/?ref=PRIYA")), "Affiliate (PRIYA)");
  assert.equal(sourceOf(null), "Unknown");
  assert.equal(sourceOf(null, { absent: "Direct" }), "Direct");
  assert.equal(sourceFromStored(null, null), "Unknown");
  assert.equal(channelOf(t("https://www.theaitimemachine.com/?gbraid=x")), "Paid Google");
});

test("checkout stores attribution; only a verified Cashfree confirmation makes it a sale", async () => {
  await prisma.payment.deleteMany({ where: { email: { startsWith: "mkt-" } } });
  const email = `mkt-${Date.now()}@shop.test`;
  const cookie = encodeMarketing({
    f: { s: "google", m: "organic", p: "/", at: Math.floor(Date.now() / 1000) - 3600 },
    l: { s: "instagram", m: "paid", c: "launch-reel", f: "fbclid123", p: "/55-ai-agents", at: Math.floor(Date.now() / 1000) },
  });
  const checkout = await createCheckout(
    new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `${MT_COOKIE}=${cookie}` },
      body: JSON.stringify({ name: "Meera Shah", email, phone: `+91 9${String(Date.now()).slice(-9)}` }),
    }),
  );
  const orderId = new URL(checkout.redirect || "").searchParams.get("order")!;
  let p = await prisma.payment.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(p.channelLast, "Paid Meta");
  assert.equal(p.channelFirst, "Organic search");
  assert.equal((p.mktLast as { c?: string }).c, "launch-reel");

  const from = new Date(Date.now() - 3600e3);
  const to = new Date(Date.now() + 3600e3);
  const meta = () => salesBySource(from, to, "channel", "last").then((r) => r.find((x) => x.key === "Paid Meta"));
  assert.equal((await meta())?.checkouts, 1);
  assert.equal((await meta())?.sales, 0);

  // Unsigned webhook: rejected, nothing confirmed.
  const payload = JSON.stringify({
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: { order: { order_id: orderId, order_amount: 1999, order_currency: "INR" }, payment: { cf_payment_id: "pay_mkt", payment_status: "SUCCESS" }, customer_details: { customer_email: email } },
  });
  assert.equal((await handleWebhook("cashfree", payload, new Headers({ "x-ai-time-machine-mock-signature": "bad" }))).status, 401);
  p = await prisma.payment.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(p.gatewayConfirmedAt, null);

  // Signed webhook: paid + confirmed, sale counted once, attribution copied to the customer.
  const headers = new Headers({ "content-type": "application/json", "x-ai-time-machine-mock-signature": mockSignature(payload) });
  assert.equal((await handleWebhook("cashfree", payload, headers)).status, 200);
  assert.equal((await handleWebhook("cashfree", payload, headers)).status, 200);
  p = await prisma.payment.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(p.status, "paid");
  assert.equal(p.gatewayConfirmedVia, "webhook");
  const row = await meta();
  assert.equal(row?.checkouts, 1);
  assert.equal(row?.sales, 1);
  assert.equal(row?.revenue, 1999);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  assert.equal(user.channelLast, "Paid Meta");
  const byCampaign = await salesBySource(from, to, "campaign", "last");
  assert.equal(byCampaign.find((r) => r.key === "launch-reel")?.sales, 1);
});

test("a visit with query params stores gclid and checkout copies the cookie through a later POST", async () => {
  const { POST } = await import("../app/api/marketing/visit/route");
  const email = `gclid-${Date.now()}@shop.test`;
  const visit = await POST(
    new Request("https://www.theaitimemachine.com/api/marketing/visit", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-host": "www.theaitimemachine.com", "x-forwarded-proto": "https" },
      body: JSON.stringify({ path: "/55-ai-agents?gclid=CjwTEST123&gbraid=GBRAID1&utm_source=google&utm_medium=cpc&utm_campaign=sales-india" }),
    }),
  );
  assert.equal(visit.status, 200);
  const cookie = visit.headers.getSetCookie?.().join("; ") || visit.headers.get("set-cookie") || "";
  assert.match(cookie, /aitm_mt=/);
  const row = await prisma.marketingVisit.findFirst({ where: { path: "/55-ai-agents" }, orderBy: { createdAt: "desc" } });
  assert.equal(row?.source, "Google Ads");
  assert.equal((row?.mkt as { g?: string } | null)?.g, "CjwTEST123");

  const mt = cookie.split(";").map((p) => p.trim()).find((p) => p.startsWith("aitm_mt="))!;
  const checkout = await createCheckout(
    new Request("https://www.theaitimemachine.com/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: mt, "x-forwarded-host": "www.theaitimemachine.com" },
      body: JSON.stringify({ name: "G Clicks", email, phone: `+91 8${String(Date.now()).slice(-9)}` }),
    }),
  );
  const orderId = (checkout.redirect || "").split("order=")[1]?.split("&")[0] || (checkout as { orderId?: string }).orderId;
  assert.ok(orderId);
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(payment.gclid, "CjwTEST123");
  assert.equal(payment.channelLast, "Paid Google");
  assert.equal((payment.mktLast as { gb?: string }).gb, "GBRAID1");
});

import { sourceSlug } from "../lib/marketing/report";
import { isTestCheckout } from "../lib/admin/metrics";

test("source slugs are stable in filter URLs", () => {
  assert.equal(sourceSlug("Google Ads"), "google_ads");
  assert.equal(sourceSlug("Instagram Ads"), "instagram_ads");
  assert.equal(sourceSlug("Direct"), "direct");
  assert.equal(sourceSlug("qa"), "qa");
  assert.equal(sourceSlug("ticktime_media"), "ticktime_media");
});

test("samayhuf plus-aliases and QA names are test checkouts; the plain paid account is not", () => {
  assert.equal(isTestCheckout({ email: "samayhuf+cfvideo@gmail.com", name: "Test Buyer" }), true);
  assert.equal(isTestCheckout({ email: "samayhuf+rzpa621l@gmail.com", name: "QA Razorpay" }), true);
  assert.equal(isTestCheckout({ email: "someone@mailinator.com" }), true);
  assert.equal(isTestCheckout({ email: "samayhuf@gmail.com", name: "Samay Vashsht" }), false);
  assert.equal(isTestCheckout({ email: "farooqkhan078645@gmail.com" }), false);
  assert.equal(isTestCheckout({ email: "kavitadevikyp089@gmail.com", name: "Kavita Devi" }), false);
});
