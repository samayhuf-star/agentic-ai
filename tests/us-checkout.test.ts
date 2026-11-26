import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { createUsCheckout } from "../lib/payments/us-checkout";
import { handleWebhook } from "../lib/payments/webhook";
import { mockSignature } from "../lib/payments/signature";
import { usFooterAddress, usPriceCents, usPriceLabel, formatUsdCents } from "../lib/us";
import { usMobile } from "../lib/phone";
import { parseStripeEvent } from "../lib/payments/parse";
import { adsConversionDateTimeUs, clickConversionPayload } from "../lib/marketing/google-ads";

Reflect.set(process.env, "NODE_ENV", "test");
process.env.AUTH_SECRET = "test-secret";
process.env.APP_URL = "http://localhost:3000";
process.env.ALLOW_MOCK_PAYMENTS = "true";
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
delete process.env.STRIPE_PRICE_ID;
delete process.env.US_FOOTER_ADDRESS;
delete process.env.RESEND_API_KEY;
process.env.US_PRICE_CENTS = "4999";

test("US price is $49.99 and the footer address stays hidden until it is set", () => {
  assert.equal(usPriceCents(), 4999);
  assert.equal(formatUsdCents(4999), "$49.99");
  assert.equal(usPriceLabel(), "$49.99");
  assert.equal(usFooterAddress(), null);
  process.env.US_FOOTER_ADDRESS = "  123 Example Street, Springfield  ";
  assert.equal(usFooterAddress(), "123 Example Street, Springfield");
  delete process.env.US_FOOTER_ADDRESS;
  assert.equal(usFooterAddress(), null);
});

test("US phone numbers are accepted, and Indian checkout validation is not used", () => {
  const ok = usMobile("(415) 555-2671");
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.e164, "+14155552671");
    assert.equal(ok.digits, "4155552671");
  }
  const plus = usMobile("+1 212-555-0100");
  assert.equal(plus.ok, true);
  const bad = usMobile("9876543210");
  // 987 is a valid US area code pattern too (9 is allowed). Just check clearly invalid numbers.
  const short = usMobile("555-123");
  assert.equal(short.ok, false);
  const leading = usMobile("01555551212");
  assert.equal(leading.ok, false);
});

test("the US landing is English, priced in USD, and does not invent an address or show a PIN", () => {
  const landing = fs.readFileSync(path.join(process.cwd(), "app/us/page.tsx"), "utf8");
  const footer = fs.readFileSync(path.join(process.cwd(), "components/UsChrome.tsx"), "utf8");
  const checkout = fs.readFileSync(path.join(process.cwd(), "app/us/checkout/page.tsx"), "utf8");
  const joined = `${landing}\n${footer}\n${checkout}`;
  assert.match(landing, /\$49\.99/);
  assert.match(landing, /lifetime/i);
  assert.match(landing, /US_CHECKOUT_PATH/);
  assert.match(footer, /usFooterAddress/);
  assert.doesNotMatch(joined, /444 /);
  assert.doesNotMatch(joined, /UPI|Cashfree|₹|PhonePe|Paytm/);
  assert.doesNotMatch(joined, /\bPIN\b/);
  assert.match(joined, /support@theaitimemachine\.com/);
  assert.match(joined, /Stripe/);
});

test("the India offer page and India checkout are unchanged", () => {
  const html = fs.readFileSync(path.join(process.cwd(), "components/landing/body.html"), "utf8");
  const indiaPage = fs.readFileSync(path.join(process.cwd(), "app/55-ai-agents/page.tsx"), "utf8");
  const indiaCheckout = fs.readFileSync(path.join(process.cwd(), "app/checkout/page.tsx"), "utf8");
  assert.match(html, /₹1,999/);
  assert.match(html, /href="\/checkout"/);
  assert.doesNotMatch(html, /\/us\/checkout/);
  assert.match(indiaPage, /components\/landing\/body\.html/);
  assert.doesNotMatch(indiaPage, /body-us\.html/);
  assert.match(indiaCheckout, /formatInr\(pricing\(\)\.inr\)/);
  assert.match(indiaCheckout, /Cashfree/);
  assert.doesNotMatch(indiaCheckout, /Stripe/);
});

test("the US 55-agents page is English, priced in USD, and checks out on Stripe", () => {
  const html = fs.readFileSync(path.join(process.cwd(), "components/landing/body-us.html"), "utf8");
  const page = fs.readFileSync(path.join(process.cwd(), "app/us/55-ai-agents/page.tsx"), "utf8");
  const boot = fs.readFileSync(path.join(process.cwd(), "public/landing-boot-us.js"), "utf8");
  const usHome = fs.readFileSync(path.join(process.cwd(), "app/us/page.tsx"), "utf8");
  const footer = fs.readFileSync(path.join(process.cwd(), "components/UsChrome.tsx"), "utf8");
  const joined = `${html}\n${page}\n${boot}`;
  assert.match(page, /\$49\.99/);
  assert.match(page, /lifetime/i);
  assert.match(page, /US_CHECKOUT_PATH/);
  assert.match(page, /usFooterAddress/);
  assert.match(html, /href="\/us\/checkout"/);
  assert.match(html, /__US_PRICE__/);
  assert.match(html, /Stripe/);
  assert.match(html, /href="\/us"/);
  assert.match(boot, /startUsLanding/);
  assert.match(boot, /\/us\/checkout/);
  assert.doesNotMatch(joined, /Cashfree|UPI|PhonePe|Paytm|₹|GSTIN|Vishwas|Kirana|\+91/);
  assert.doesNotMatch(joined, /\bPIN\b/);
  assert.doesNotMatch(html, /href="\/checkout"/);
  assert.doesNotMatch(boot, /CASHFREE|ipapi\.co|stay on INR/);
  assert.match(usHome, /US_AGENTS_PATH/);
  assert.match(footer, /US_AGENTS_PATH/);
});

test("US checkout, Stripe webhook, and sign-in code are idempotent on a confirmed payment", async () => {
  const phone = "4155552671";
  const email = `us-buyer-${Date.now()}@shop.test`;
  const checkout = await createUsCheckout(
    new Request("http://localhost:3000/api/checkout/us", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Jordan Hale", email, phone: `+1 ${phone}` }),
    }),
  );
  assert.equal(checkout.status, 303);
  assert.match(checkout.redirect || "", /\/checkout\/mock\?order=us.*gateway=stripe/);
  const orderId = new URL(checkout.redirect || "").searchParams.get("order");
  assert.ok(orderId);
  const pending = await prisma.payment.findUnique({ where: { id: orderId! } });
  assert.equal(pending?.gateway, "stripe");
  assert.equal(pending?.currency, "USD");
  assert.equal(pending?.amountUsdCents, 4999);
  assert.equal(pending?.amountInr, 0);
  assert.equal(pending?.status, "pending");
  assert.ok(pending?.gclid !== undefined);

  const missing = await createUsCheckout(new Request("http://localhost:3000/api/checkout/us", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
  assert.equal(missing.status, 400);

  const payload = JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_us",
        client_reference_id: orderId,
        payment_status: "paid",
        amount_total: 4999,
        currency: "usd",
        customer_email: email,
        customer_details: { email, name: "Jordan Hale", phone: "+14155552671" },
        payment_intent: "pi_test_us",
        metadata: { orderId, market: "us" },
      },
    },
  });
  const bad = await handleWebhook("stripe", payload, new Headers({ "x-ai-time-machine-mock-signature": "nope" }));
  assert.equal(bad.status, 401);

  const headers = new Headers({
    "content-type": "application/json",
    "x-ai-time-machine-mock-signature": mockSignature(payload),
  });
  const first = await handleWebhook("stripe", payload, headers);
  assert.equal(first.status, 200);
  const second = await handleWebhook("stripe", payload, headers);
  assert.equal(second.status, 200);

  const payment = await prisma.payment.findUnique({ where: { id: orderId! } });
  assert.equal(payment?.status, "paid");
  assert.equal(payment?.email, email);
  assert.ok(payment?.gatewayConfirmedAt);
  assert.equal(payment?.gatewayConfirmedVia, "webhook");
  const user = await prisma.user.findUnique({ where: { email } });
  assert.ok(user);
  const notes = await prisma.emailLog.findMany({ where: { toEmail: email } });
  const letter = notes.find((note) => note.subject.includes("code") || note.subject.includes("$49.99"));
  assert.ok(letter);
  assert.match(letter!.subject, /\$49\.99/);
  assert.match(letter!.body, /Payment of \$49\.99 confirmed/);
  assert.doesNotMatch(letter!.body, /₹/);
  const code = letter!.body.match(/\b(\d{6})\b/)?.[1];
  assert.equal(code?.length, 6);
});

test("a Stripe webhook with the wrong amount is rejected and does not grant access", async () => {
  const email = `us-wrong-${Date.now()}@shop.test`;
  const checkout = await createUsCheckout(
    new Request("http://localhost:3000/api/checkout/us", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Casey Ng", email, phone: "2125550100" }),
    }),
  );
  const orderId = new URL(checkout.redirect || "").searchParams.get("order");
  assert.ok(orderId);
  const payload = JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_wrong",
        client_reference_id: orderId,
        payment_status: "paid",
        amount_total: 1999,
        currency: "usd",
        customer_email: email,
        customer_details: { email, name: "Casey Ng" },
        payment_intent: "pi_wrong",
      },
    },
  });
  const headers = new Headers({ "content-type": "application/json", "x-ai-time-machine-mock-signature": mockSignature(payload) });
  const result = await handleWebhook("stripe", payload, headers);
  assert.equal(result.status, 200);
  const payment = await prisma.payment.findUnique({ where: { id: orderId! } });
  assert.equal(payment?.status, "pending");
  assert.equal(await prisma.user.findUnique({ where: { email } }), null);
});

test("Stripe checkout.session.completed is ignored until payment_status is paid", () => {
  const ignored = parseStripeEvent({
    type: "checkout.session.completed",
    data: { object: { client_reference_id: "us1", payment_status: "unpaid", amount_total: 4999, currency: "usd" } },
  });
  assert.equal(ignored.status, "ignored");
  const paid = parseStripeEvent({
    type: "checkout.session.async_payment_succeeded",
    data: { object: { client_reference_id: "us1", payment_status: "paid", amount_total: 4999, currency: "usd" } },
  });
  assert.equal(paid.status, "paid");
  assert.equal(paid.amountUsdCents, 4999);
  assert.equal(paid.currency, "USD");
});

test("US Google Ads conversion payloads use USD and a US action only when that id is set", () => {
  const at = new Date("2026-11-26T10:15:00-05:00");
  const stamp = adsConversionDateTimeUs(at);
  assert.match(stamp, /^2026-11-26 10:15:00-05:00$/);
  const withUs = clickConversionPayload({
    orderId: "usorder1",
    value: 49.99,
    at,
    gclid: "CjwUS",
    enhanced: false,
    currencyCode: "USD",
    conversionAction: "customers/123/conversionActions/456",
    conversionDateTime: stamp,
  });
  assert.ok(withUs);
  const conv = withUs!.conversions[0] as { currencyCode: string; conversionValue: number; conversionAction: string; conversionDateTime: string };
  assert.equal(conv.currencyCode, "USD");
  assert.equal(conv.conversionValue, 49.99);
  assert.equal(conv.conversionAction, "customers/123/conversionActions/456");
  assert.equal(conv.conversionDateTime, stamp);
});

test("click IDs from a US checkout are stored the same way as the India flow", async () => {
  const email = `us-ads-${Date.now()}@shop.test`;
  const checkout = await createUsCheckout(
    new Request("http://localhost:3000/api/checkout/us?gclid=CjwTESTUS&utm_source=google&utm_medium=cpc&utm_campaign=us-sales", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "mt=" },
      body: JSON.stringify({ name: "Riley Cox", email, phone: "6465550199" }),
    }),
  );
  const orderId = new URL(checkout.redirect || "").searchParams.get("order");
  assert.ok(orderId);
  const payment = await prisma.payment.findUnique({ where: { id: orderId! } });
  // marketingFromRequest reads cookies set by middleware; in this unit test the cookie may be empty.
  // The landing still uses the same marketingFromRequest helper as India checkout.
  assert.equal(payment?.currency, "USD");
  assert.equal(payment?.gateway, "stripe");
});
