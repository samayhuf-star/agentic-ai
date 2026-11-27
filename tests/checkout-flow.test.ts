import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { createCheckout } from "../lib/payments/checkout";
import { handleWebhook } from "../lib/payments/webhook";
import { mockSignature, verifyPayuSignature, verifyRazorpaySignature } from "../lib/payments/signature";
import { mockPaymentsAllowed } from "../lib/config";
import { requestLoginCode, verifyLoginCode } from "../lib/auth";
import { hashSecret } from "../lib/crypto";
import { fulfillPayment } from "../lib/payments/fulfill";
import { POST as onboard } from "../app/api/onboarding/route";

Reflect.set(process.env, "NODE_ENV", "test");
process.env.AUTH_SECRET = "test-secret";
process.env.APP_URL = "http://localhost:3000";
process.env.ADMIN_EMAILS = "owner@adiology.io";
process.env.ALLOW_MOCK_PAYMENTS = "true";
delete process.env.CASHFREE_APP_ID;
delete process.env.CASHFREE_SECRET_KEY;
delete process.env.RAZORPAY_KEY_ID;
delete process.env.RAZORPAY_KEY_SECRET;
delete process.env.PAYU_MERCHANT_KEY;
delete process.env.PAYU_SALT;
delete process.env.CHECKOUT_URL;
delete process.env.RESEND_API_KEY;

test("checkout, webhook, email code, and team setup in mock mode", async () => {
  const phone = `9${String(Date.now()).slice(-9)}`;
  const email = `buyer-${Date.now()}@shop.test`;
  const checkout = await createCheckout(
    new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Asha Rao", email, phone: `+91 ${phone}` }),
    }),
  );
  assert.equal(checkout.status, 303);
  assert.match(checkout.redirect || "", /\/checkout\/mock\?order=br/);
  const orderId = new URL(checkout.redirect || "").searchParams.get("order");
  assert.ok(orderId);

  const missing = await createCheckout(new Request("http://localhost:3000/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
  assert.equal(missing.status, 400);

  const payload = JSON.stringify({
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: {
      order: { order_id: orderId, order_amount: 1999, order_currency: "INR" },
      payment: { cf_payment_id: "pay_test", payment_status: "SUCCESS" },
      customer_details: { customer_phone: phone, customer_email: email, customer_name: "Asha Rao" },
    },
  });
  const bad = await handleWebhook("cashfree", payload, new Headers({ "x-ai-time-machine-mock-signature": "nope" }));
  assert.equal(bad.status, 401);

  const headers = new Headers({
    "content-type": "application/json",
    "x-ai-time-machine-mock-signature": mockSignature(payload),
  });
  const first = await handleWebhook("cashfree", payload, headers);
  assert.equal(first.status, 200);
  const second = await handleWebhook("cashfree", payload, headers);
  assert.equal(second.status, 200);

  const payment = await prisma.payment.findUnique({ where: { id: orderId! } });
  assert.equal(payment?.status, "paid");
  assert.equal(payment?.email, email);
  assert.equal(payment?.name, "Asha Rao");
  const user = await prisma.user.findUnique({ where: { email } });
  assert.ok(user);
  assert.equal(user?.onboardedAt, null);
  assert.equal(user?.businessName, null);
  assert.equal(user?.goal, null);
  assert.equal(await prisma.userAgent.count({ where: { userId: user!.id } }), 55);
  const notes = await prisma.emailLog.findMany({ where: { toEmail: email } });
  assert.ok(notes.some((note) => note.subject.includes("code")));
  const code = notes.find((note) => note.subject.includes("code"))?.body.match(/\b(\d{6})\b/)?.[1];
  assert.equal(code?.length, 6);

  const verified = await verifyLoginCode(email, code!);
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  assert.equal(verified.redirect, "/onboarding");
  const saved = await prisma.user.findUnique({ where: { id: user!.id } });
  assert.equal(saved?.email, email);

  const setup = await onboard(
    new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `ai_time_machine_session=${verified.token}` },
      body: JSON.stringify({ businessName: "Chai and Co", sells: "masala chai", goal: "posts" }),
    }),
  );
  assert.equal(setup.status, 200);
  const again = await onboard(
    new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `ai_time_machine_session=${verified.token}` },
      body: JSON.stringify({ businessName: "Chai and Co", sells: "masala chai", goal: "posts" }),
    }),
  );
  assert.equal(again.status, 200);
  const againBody = (await again.json()) as { ok?: boolean; redirect?: string; message?: string; team?: unknown[] };
  assert.equal(againBody.team?.length && againBody.team.length > 0, true);
  assert.equal(againBody.redirect, undefined);
  const finished = await onboard(
    new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `ai_time_machine_session=${verified.token}` },
      body: JSON.stringify({ step: "finish" }),
    }),
  );
  const finishedBody = (await finished.json()) as { redirect?: string };
  assert.equal(finished.status, 200);
  assert.equal(finishedBody.redirect, "/dashboard");
  const teamCount = await prisma.userAgent.count({ where: { userId: user!.id } });
  const enabled = await prisma.userAgent.count({ where: { userId: user!.id, enabled: true } });
  assert.equal(teamCount, 55);
  assert.ok(enabled > 0 && enabled < 55);
  const waiting = await prisma.approval.count({ where: { userId: user!.id, status: "pending" } });
  assert.equal(waiting, 2);

  process.env.ADMIN_EMAILS = "other@example.com, Owner@Adiology.io";
  const adminCode = await requestLoginCode("owner@adiology.io", new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.20" } }));
  assert.equal(adminCode.ok, true);
  if (!adminCode.ok) return;
  const admin = await verifyLoginCode("owner@adiology.io", adminCode.devCode!);
  assert.equal(admin.ok, true);
  if (!admin.ok) return;
  assert.equal(admin.isAdmin, true);
  assert.equal(admin.redirect, "/dashboard");
  const adminUser = await prisma.user.findUnique({ where: { email: "owner@adiology.io" }, include: { payments: true } });
  assert.ok(adminUser);
  assert.equal(adminUser?.compAccess, true);
  assert.ok(adminUser?.onboardedAt);
  assert.equal(adminUser?.phone, null);
  assert.equal(adminUser?.payments.length, 0);
  const { ensureTeam } = await import("../lib/team");
  await ensureTeam(adminUser!.id);
  assert.equal(await prisma.userAgent.count({ where: { userId: adminUser!.id } }), 55);

  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_FROM = "AI Time Machine <no-reply@adiology.io>";
  process.env.ADMIN_EMAILS = "resend-owner@example.com";
  const originalFetch = globalThis.fetch;
  const sent: { url: string; body: { from?: string; to?: string; subject?: string; text?: string; reply_to?: string } } = { url: "", body: {} };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sent.url = String(input);
    sent.body = JSON.parse(String(init?.body || "{}"));
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const mailed = await requestLoginCode("resend-owner@example.com", new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.40" } }));
    assert.equal(mailed.ok, true);
    assert.equal(sent.url, "https://api.resend.com/emails");
    assert.equal(sent.body.from, "AI Time Machine <no-reply@adiology.io>");
    assert.equal(sent.body.to, "resend-owner@example.com");
    assert.equal(sent.body.subject, "Your AI Time Machine code");
    assert.match(sent.body.text || "", /^Your AI Time Machine code is \d{6}\. It expires in 24 hours\./);
    assert.equal(sent.body.reply_to, "support@theaitimemachine.com");
    const log = await prisma.emailLog.findFirst({ where: { toEmail: "resend-owner@example.com" }, orderBy: { createdAt: "desc" } });
    assert.equal(log?.provider, "resend");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
  }

  for (let i = 0; i < 6; i += 1) {
    await requestLoginCode(email, new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.30" } }));
  }
  const limited = await requestLoginCode(email, new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.30" } }));
  assert.equal(limited.status, 429);
});

test("a Cashfree return marks a pending order paid when Cashfree says it is paid", async () => {
  const { confirmPendingCashfreeOrder } = await import("../lib/payments/confirm");
  const orderId = `brconfirm${Date.now()}`;
  const phone = `8${String(Date.now()).slice(-9)}`;
  const email = `return-${Date.now()}@shop.test`;
  await prisma.payment.create({ data: { id: orderId, gateway: "cashfree", amountInr: 1999, status: "pending", email, phone: `+91${phone}`, name: "Return Buyer" } });
  process.env.CASHFREE_APP_ID = "test_id";
  process.env.CASHFREE_SECRET_KEY = "test_secret";
  process.env.CASHFREE_ENV = "TEST";
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ order_status: "PAID", order_amount: 1999, customer_details: { customer_phone: phone, customer_email: email, customer_name: "Return Buyer" } }), {
      status: 200,
    })) as typeof fetch;
  try {
    const payment = await confirmPendingCashfreeOrder(orderId);
    assert.equal(payment?.status, "paid");
    const user = await prisma.user.findUnique({ where: { email } });
    assert.equal(user?.onboardedAt, null);
    assert.equal(await prisma.userAgent.count({ where: { userId: user!.id } }), 55);
    const again = await confirmPendingCashfreeOrder(orderId);
    assert.equal(again?.userId, user!.id);
    const blocked = await requestLoginCode(`new-${Date.now()}@shop.test`, new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.50" } }));
    assert.equal(blocked.status, 403);
  } finally {
    globalThis.fetch = original;
    delete process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_SECRET_KEY;
  }
});

test("a paid order can be fulfilled again and the code resent", async () => {
  const { fulfilOrder } = await import("../lib/payments/manual");
  const { indianMobile } = await import("../lib/phone");
  const plus = indianMobile("+91 98450 11223");
  const zero = indianMobile("09845011223");
  const country = indianMobile("919845011223");
  assert.equal(plus.ok ? plus.digits : "", "9845011223");
  assert.equal(zero.ok ? zero.digits : "", "9845011223");
  assert.equal(country.ok ? country.digits : "", "9845011223");
  assert.equal(indianMobile("5845011223").ok, false);

  const orderId = `brmanual${Date.now()}`;
  const email = `manual-${Date.now()}@shop.test`;
  await prisma.payment.create({
    data: { id: orderId, gateway: "cashfree", amountInr: 1999, status: "paid_unassigned", phone: "+919845011223", name: "Manual Buyer" },
  });
  process.env.CASHFREE_APP_ID = "test_id";
  process.env.CASHFREE_SECRET_KEY = "test_secret";
  process.env.CASHFREE_ENV = "TEST";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ order_status: "PAID", order_amount: 1999, customer_details: { customer_phone: "9845011223" } }), { status: 200 })) as typeof fetch;
  try {
    const first = await fulfilOrder(orderId, { email });
    assert.equal(first.ok, true);
    assert.equal(first.cashfreeStatus, "PAID");
    const user = await prisma.user.findUnique({ where: { email } });
    assert.equal(user?.onboardedAt, null);
    assert.equal(await prisma.userAgent.count({ where: { userId: user!.id } }), 55);
    const second = await fulfilOrder(orderId, { email });
    assert.equal(second.ok, true);
    const codes = await prisma.emailLog.count({ where: { toEmail: email, subject: { contains: "code" } } });
    assert.equal(codes, 2);
  } finally {
    globalThis.fetch = original;
    delete process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_SECRET_KEY;
  }
});

test("an old pending, unpaid, or test order does not block the same email or phone", async () => {
  const { fulfillPayment } = await import("../lib/payments/fulfill");
  const { confirmPendingCashfreeOrder } = await import("../lib/payments/confirm");
  const { KNOWN_TEST_ORDER_ID } = await import("../lib/payments/test-orders");
  const stamp = Date.now();
  const email = "samay@krosz.com";
  const phone = `+919${String(stamp).slice(-9)}`;
  const buyer = { name: "Samay", email, phone };

  await prisma.payment.upsert({
    where: { id: KNOWN_TEST_ORDER_ID },
    create: { id: KNOWN_TEST_ORDER_ID, gateway: "cashfree", amountInr: 1999, status: "paid_unassigned", email, phone, name: buyer.name },
    update: { status: "paid_unassigned", email, phone, name: buyer.name, userId: null, isTest: false },
  });
  await prisma.payment.updateMany({ where: { id: KNOWN_TEST_ORDER_ID }, data: { isTest: true } });

  const pendingId = `brpending${stamp}`;
  const unfulfilledId = `brunf${stamp}`;
  await prisma.payment.create({ data: { id: pendingId, gateway: "cashfree", amountInr: 1999, status: "pending", ...buyer } });
  await prisma.payment.create({ data: { id: unfulfilledId, gateway: "cashfree", amountInr: 1999, status: "paid", paidAt: new Date(), ...buyer } });

  async function newCheckout() {
    const checkout = await createCheckout(
      new Request("http://localhost:3000/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buyer),
      }),
    );
    assert.equal(checkout.status, 303);
    const orderId = new URL(checkout.redirect || "").searchParams.get("order");
    assert.ok(orderId);
    assert.notEqual(orderId, pendingId);
    assert.notEqual(orderId, unfulfilledId);
    assert.notEqual(orderId, KNOWN_TEST_ORDER_ID);
    return orderId;
  }

  const firstId = await newCheckout();
  const secondId = await newCheckout();
  assert.notEqual(firstId, secondId);

  await fulfillPayment("cashfree", {
    orderId: firstId,
    status: "paid",
    amountInr: 1999,
    currency: "INR",
    phone,
    email,
    name: buyer.name,
    gatewayPaymentId: "pay_new",
    raw: { orderId: firstId },
  });
  const fresh = await prisma.payment.findUnique({ where: { id: firstId } });
  assert.equal(fresh?.status, "paid");
  assert.equal(fresh?.isTest, false);
  assert.ok(fresh?.userId);
  const user = await prisma.user.findUnique({ where: { email } });
  assert.equal(fresh?.userId, user?.id);

  const pending = await prisma.payment.findUnique({ where: { id: pendingId } });
  assert.equal(pending?.status, "pending");
  assert.equal(pending?.userId, null);
  const unfulfilled = await prisma.payment.findUnique({ where: { id: unfulfilledId } });
  assert.equal(unfulfilled?.userId, null);
  const known = await prisma.payment.findUnique({ where: { id: KNOWN_TEST_ORDER_ID } });
  assert.equal(known?.isTest, true);
  assert.equal(known?.userId, null);
  assert.equal(known?.status, "paid_unassigned");

  process.env.CASHFREE_APP_ID = "test_id";
  process.env.CASHFREE_SECRET_KEY = "test_secret";
  process.env.CASHFREE_ENV = "TEST";
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ order_status: "PAID", order_amount: 1999, customer_details: { customer_email: email, customer_phone: phone } }), { status: 200 })) as typeof fetch;
  try {
    const returned = await confirmPendingCashfreeOrder(KNOWN_TEST_ORDER_ID);
    assert.equal(returned?.isTest, true);
    assert.equal(returned?.userId, null);
    assert.equal(returned?.status, "paid_unassigned");
  } finally {
    globalThis.fetch = original;
    delete process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_SECRET_KEY;
  }

  await fulfillPayment("cashfree", {
    orderId: secondId,
    status: "paid",
    amountInr: 1999,
    currency: "INR",
    phone,
    email,
    name: buyer.name,
    gatewayPaymentId: "pay_newer",
    raw: { orderId: secondId },
  });
  const newer = await prisma.payment.findUnique({ where: { id: secondId } });
  assert.equal(newer?.userId, user?.id);
  assert.equal(await prisma.payment.count({ where: { id: KNOWN_TEST_ORDER_ID, status: "paid", isTest: false } }), 0);
  assert.equal(await prisma.payment.count({ where: { id: firstId, status: "paid", isTest: false } }), 1);
});

test("the return page and the webhook share one sign-in code", async () => {
  const { sendFulfilmentCode } = await import("../lib/payments/sign-in-code");
  const stamp = Date.now();
  const email = `race-${stamp}@shop.test`;
  const orderId = `brrace${stamp}`;
  const phone = `+918${String(stamp).slice(-9)}`;
  await prisma.payment.create({
    data: { id: orderId, gateway: "cashfree", amountInr: 1999, status: "pending", email, phone, name: "Race Buyer" },
  });
  const event = {
    orderId,
    status: "paid" as const,
    amountInr: 1999,
    currency: "INR",
    phone,
    email,
    name: "Race Buyer",
    gatewayPaymentId: null,
    raw: { source: "race" },
  };
  const settled = await Promise.allSettled([fulfillPayment("cashfree", event), fulfillPayment("cashfree", event)]);
  assert.ok(settled.some((item) => item.status === "fulfilled"));
  const notes = await prisma.emailLog.findMany({ where: { toEmail: email, subject: { in: ["Payment of ₹1,999 confirmed — your sign-in code", "Your AI Time Machine code"] } } });
  assert.equal(notes.length, 1);
  assert.match(notes[0].body, /Payment of ₹1,999 confirmed/);
  assert.match(notes[0].body, /login\?email=race-/);
  assert.match(notes[0].body, /Future logins use this same email and a new one-time code/);
  const code = notes[0].body.match(/code is (\d{6})/)?.[1];
  assert.equal(code?.length, 6);
  const saved = await prisma.loginCode.findFirst({ where: { email } });
  assert.equal(saved?.codeHash, hashSecret(code!));
  await fulfillPayment("cashfree", event);
  assert.equal(await prisma.emailLog.count({ where: { toEmail: email, subject: { in: ["Payment of ₹1,999 confirmed — your sign-in code", "Your AI Time Machine code"] } } }), 1);
  assert.equal((await prisma.loginCode.findFirst({ where: { email } }))?.codeHash, saved?.codeHash);
  const resent = await sendFulfilmentCode(orderId, email, "resend");
  assert.equal(resent.ok, true);
  const again = await prisma.emailLog.findMany({ where: { toEmail: email, subject: { in: ["Payment of ₹1,999 confirmed — your sign-in code", "Your AI Time Machine code"] } }, orderBy: { createdAt: "desc" } });
  assert.equal(again.length, 2);
  assert.match(again[0].body, new RegExp(`code is ${code}`));
  assert.equal((await prisma.loginCode.findFirst({ where: { email } }))?.codeHash, hashSecret(code!));
  const verified = await verifyLoginCode(email, code!);
  assert.equal(verified.ok, true);
});

test("fulfilment rejects a gateway, amount, or currency that does not match the order", async () => {
  const stamp = Date.now();
  const orderId = `brmatch${stamp}`;
  const email = `match-${stamp}@shop.test`;
  await prisma.payment.create({
    data: { id: orderId, gateway: "cashfree", amountInr: 1999, status: "pending", email, phone: `+917${String(stamp).slice(-9)}`, name: "Match" },
  });
  const base = { orderId, status: "paid" as const, phone: null, email, name: "Match", gatewayPaymentId: null, raw: {} };
  assert.equal((await fulfillPayment("cashfree", { ...base, amountInr: 1, currency: "INR" })).ok, false);
  assert.equal((await fulfillPayment("razorpay", { ...base, amountInr: 1999, currency: "INR" })).ok, false);
  assert.equal((await fulfillPayment("cashfree", { ...base, amountInr: 1999, currency: "USD" })).ok, false);
  const still = await prisma.payment.findUnique({ where: { id: orderId } });
  assert.equal(still?.status, "pending");
  assert.equal(still?.userId, null);
});

test("production refuses mock checkout and an unconfigured Razorpay or PayU webhook", async () => {
  const previousAllow = process.env.ALLOW_MOCK_PAYMENTS;
  Reflect.set(process.env, "NODE_ENV", "production");
  delete process.env.ALLOW_MOCK_PAYMENTS;
  try {
    assert.equal(mockPaymentsAllowed(), false);
    assert.equal(verifyRazorpaySignature("{}", new Headers()), false);
    assert.equal(verifyPayuSignature("status=success", new Headers(), "application/json"), false);
    const { POST } = await import("../app/api/checkout/mock-complete/route");
    const response = await POST(new Request("http://localhost/api/checkout/mock-complete", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
    assert.equal(response.status, 404);
  } finally {
    Reflect.set(process.env, "NODE_ENV", "test");
    process.env.ALLOW_MOCK_PAYMENTS = previousAllow;
  }
});


test("UPI checkout asks Cashfree for UPI only, and the card path excludes UPI", async () => {
  const { paymentMethodsFor } = await import("../lib/payments/checkout");
  const { CASHFREE_METHODS_UPI, CASHFREE_METHODS_OTHER, CASHFREE_METHODS, createHostedCheckout } = await import("../lib/payments/gateways");
  const { shouldHoldCashfreeHandoff } = await import("../lib/device");
  assert.equal(paymentMethodsFor("upi"), "upi");
  assert.equal(paymentMethodsFor("other"), "cc,dc,nb,app");
  assert.equal(paymentMethodsFor(undefined), undefined);
  assert.equal(CASHFREE_METHODS_UPI, "upi");
  assert.equal(CASHFREE_METHODS_OTHER, "cc,dc,nb,app");
  assert.equal(CASHFREE_METHODS, "cc,dc,upi,nb,app");
  assert.equal(shouldHoldCashfreeHandoff("snapchat"), true);
  assert.equal(shouldHoldCashfreeHandoff("facebook"), true);
  assert.equal(shouldHoldCashfreeHandoff("instagram"), true);
  assert.equal(shouldHoldCashfreeHandoff("linkedin"), true);
  assert.equal(shouldHoldCashfreeHandoff("line"), true);
  assert.equal(shouldHoldCashfreeHandoff("google"), true);
  assert.equal(shouldHoldCashfreeHandoff("webview"), true);
  assert.equal(shouldHoldCashfreeHandoff(null), false);

  const { preferredBrowser, osOf } = await import("../lib/device");
  assert.equal(preferredBrowser("ios"), "Safari");
  assert.equal(preferredBrowser("android"), "Chrome");
  assert.equal(preferredBrowser("other"), "Chrome");
  assert.equal(preferredBrowser(osOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) Instagram 320.0.0.0")), "Safari");
  assert.equal(preferredBrowser(osOf("Mozilla/5.0 (Linux; Android 13; SM-A145F) Instagram 320.0.0.0")), "Chrome");

  const root = path.join(process.cwd());
  const checkoutPage = fs.readFileSync(path.join(root, "app/checkout/page.tsx"), "utf8");
  const landingPage = fs.readFileSync(path.join(root, "app/55-ai-agents/page.tsx"), "utf8");
  const holdPage = fs.readFileSync(path.join(root, "components/CashfreeStart.tsx"), "utf8");
  assert.match(checkoutPage, /InAppPayGate/);
  assert.doesNotMatch(landingPage, /InAppPayGate/);
  assert.doesNotMatch(landingPage, /InAppBrowserNotice/);
  assert.match(holdPage, /InAppPayGate/);
  assert.doesNotMatch(holdPage, /Continue here anyway/);

  process.env.CASHFREE_APP_ID = "test_id";
  process.env.CASHFREE_SECRET_KEY = "test_secret";
  process.env.CASHFREE_ENV = "TEST";
  const original = globalThis.fetch;
  const bodies: unknown[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body || "{}")));
    return new Response(JSON.stringify({ payment_session_id: "sess_test" }), { status: 200 });
  }) as typeof fetch;
  try {
    const upi = await createHostedCheckout({
      orderId: "brupi1",
      amountInr: 1999,
      origin: "https://www.theaitimemachine.com",
      gateway: "cashfree",
      customer: { name: "Asha", email: "a@shop.test", phone: "9999999999" },
      paymentMethods: CASHFREE_METHODS_UPI,
    });
    assert.match(upi.url, /checkout\/start\?session=sess_test/);
    const other = await createHostedCheckout({
      orderId: "brother1",
      amountInr: 1999,
      origin: "https://www.theaitimemachine.com",
      gateway: "cashfree",
      customer: { name: "Asha", email: "a@shop.test", phone: "9999999999" },
      paymentMethods: CASHFREE_METHODS_OTHER,
    });
    assert.ok(other.url);
    const fallback = await createHostedCheckout({
      orderId: "brall1",
      amountInr: 1999,
      origin: "https://www.theaitimemachine.com",
      gateway: "cashfree",
      customer: { name: "Asha", email: "a@shop.test", phone: "9999999999" },
    });
    assert.ok(fallback.url);
    const methods = bodies.map((body) => (body as { order_meta?: { payment_methods?: string } }).order_meta?.payment_methods);
    assert.deepEqual(methods, ["upi", "cc,dc,nb,app", "cc,dc,upi,nb,app"]);
  } finally {
    globalThis.fetch = original;
    delete process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_SECRET_KEY;
  }
});

test("requesting a sign-in code again reuses the unexpired 24-hour code", async () => {
  const { requestLoginCode } = await import("../lib/auth");
  const { hashSecret } = await import("../lib/crypto");
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_FROM = "AI Time Machine <no-reply@adiology.io>";
  process.env.ADMIN_EMAILS = "reuse-owner@example.com";
  const original = globalThis.fetch;
  const bodies: string[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || "{}")) as { text?: string };
    if (body.text) bodies.push(body.text);
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const first = await requestLoginCode(
      "reuse-owner@example.com",
      new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.81" } }),
    );
    const second = await requestLoginCode(
      "reuse-owner@example.com",
      new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.81" } }),
    );
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(bodies.length, 2);
    const code = bodies[0].match(/code is (\d{6})/)?.[1];
    assert.equal(code, bodies[1].match(/code is (\d{6})/)?.[1]);
    assert.match(bodies[0], /expires in 24 hours/);
    const rows = await prisma.loginCode.findMany({ where: { email: "reuse-owner@example.com" } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].codeHash, hashSecret(code!));
    assert.ok(rows[0].expiresAt.getTime() - Date.now() > 20 * 60 * 60 * 1000);
  } finally {
    globalThis.fetch = original;
    delete process.env.RESEND_API_KEY;
  }
});

test("Cashfree expiry and drop webhooks count as failed payments for recovery", async () => {
  const { parseCashfreeEvent } = await import("../lib/payments/parse");
  const expired = parseCashfreeEvent({ type: "ORDER_EXPIRED", data: { order: { order_id: "brexpire1", order_amount: 1999, order_currency: "INR" } } });
  assert.equal(expired.status, "failed");
  assert.equal(expired.orderId, "brexpire1");
  const dropped = parseCashfreeEvent({ type: "PAYMENT_USER_DROPPED_WEBHOOK", data: { order: { order_id: "brdrop1", order_amount: 1999, order_currency: "INR" }, payment: { payment_status: "USER_DROPPED" } } });
  assert.equal(dropped.status, "failed");
});
