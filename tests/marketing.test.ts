import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { createCheckout } from "../lib/payments/checkout";
import { handleWebhook } from "../lib/payments/webhook";
import { mockSignature } from "../lib/payments/signature";
import { channelOf, decodeMarketing, encodeMarketing, mergeTouch, MT_COOKIE, touchFromRequest } from "../lib/marketing/touch";
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
});

test("checkout stores attribution; only a verified Cashfree confirmation makes it a sale", async () => {
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
  assert.equal((await meta())?.signups, 1);
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
  assert.equal(row?.sales, 1);
  assert.equal(row?.revenue, 1999);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  assert.equal(user.channelLast, "Paid Meta");
  const byCampaign = await salesBySource(from, to, "campaign", "last");
  assert.equal(byCampaign.find((r) => r.key === "launch-reel")?.sales, 1);
});
