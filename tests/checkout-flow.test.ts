import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { createCheckout } from "../lib/payments/checkout";
import { handleWebhook } from "../lib/payments/webhook";
import { mockSignature } from "../lib/payments/signature";
import { requestLoginCode, verifyLoginCode } from "../lib/auth";
import { POST as onboard } from "../app/api/onboarding/route";

process.env.NODE_ENV = "test";
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
  assert.ok(user?.onboardedAt);
  assert.equal(await prisma.userAgent.count({ where: { userId: user!.id } }), 55);
  const notes = await prisma.emailLog.findMany({ where: { toEmail: email } });
  assert.ok(notes.some((note) => note.subject.includes("code")));
  const code = notes.find((note) => note.subject.includes("code"))?.body.match(/\b(\d{6})\b/)?.[1];
  assert.equal(code?.length, 6);

  const verified = await verifyLoginCode(email, code!);
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  assert.equal(verified.redirect, "/dashboard");
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
  const againBody = (await again.json()) as { ok?: boolean; redirect?: string; message?: string };
  assert.equal(againBody.ok, true);
  assert.equal(againBody.redirect, "/dashboard");
  assert.equal(againBody.message, undefined);
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
  let sent: { url: string; body: { from?: string; to?: string; subject?: string; text?: string; reply_to?: string } } | null = null;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    sent = { url: String(input), body: JSON.parse(String(init?.body || "{}")) };
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const mailed = await requestLoginCode("resend-owner@example.com", new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.40" } }));
    assert.equal(mailed.ok, true);
    assert.equal(sent?.url, "https://api.resend.com/emails");
    assert.equal(sent?.body.from, "AI Time Machine <no-reply@adiology.io>");
    assert.equal(sent?.body.to, "resend-owner@example.com");
    assert.equal(sent?.body.subject, "Your AI Time Machine code");
    assert.match(sent?.body.text || "", /^Your AI Time Machine code is \d{6}\. It expires in 10 minutes\./);
    assert.equal(sent?.body.reply_to, "support@theaitimemachine.com");
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
    assert.ok(user?.onboardedAt);
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
  assert.equal(indianMobile("+91 98450 11223").ok && indianMobile("+91 98450 11223").digits, "9845011223");
  assert.equal(indianMobile("09845011223").ok && indianMobile("09845011223").digits, "9845011223");
  assert.equal(indianMobile("919845011223").ok && indianMobile("919845011223").digits, "9845011223");
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
    assert.ok(user?.onboardedAt);
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
