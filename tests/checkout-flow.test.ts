import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { createCheckout } from "../lib/payments/checkout";
import { handleWebhook } from "../lib/payments/webhook";
import { mockSignature } from "../lib/payments/signature";
import { requestLoginCode, startWelcome, verifyLoginCode } from "../lib/auth";
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
  const checkout = await createCheckout(new Request("http://localhost:3000/api/checkout", { method: "POST" }));
  assert.equal(checkout.status, 303);
  assert.match(checkout.redirect || "", /\/checkout\/mock\?order=br/);
  const orderId = new URL(checkout.redirect || "").searchParams.get("order");
  assert.ok(orderId);

  const payload = JSON.stringify({
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: {
      order: { order_id: orderId, order_amount: 1999, order_currency: "INR" },
      payment: { cf_payment_id: "pay_test", payment_status: "SUCCESS" },
      customer_details: { customer_phone: phone },
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
  const user = await prisma.user.findUnique({ where: { phone: payment!.phone! } });
  assert.ok(user);
  const texts = await prisma.smsLog.findMany({ where: { phone: user!.phone } });
  assert.equal(texts.length, 1);
  const token = texts[0].body.split("token=")[1];
  assert.ok(token);

  const blocked = await requestLoginCode(email, new Request("http://localhost/api/auth/request-code"));
  assert.equal(blocked.status, 403);

  const welcome = await startWelcome(token, email, new Request("http://localhost/api/welcome", { headers: { "x-forwarded-for": "203.0.113.10" } }));
  assert.equal(welcome.ok, true);
  assert.equal(welcome.devCode?.length, 6);

  const verified = await verifyLoginCode(email, welcome.devCode!);
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  const saved = await prisma.user.findUnique({ where: { id: user!.id } });
  assert.equal(saved?.email, email);
  const notes = await prisma.emailLog.findMany({ where: { toEmail: email } });
  assert.ok(notes.some((note) => note.subject.includes("code")));
  assert.ok(notes.some((note) => note.subject.includes("ready")));

  const setup = await onboard(
    new Request("http://localhost/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `ai_time_machine_session=${verified.token}` },
      body: JSON.stringify({ businessName: "Chai and Co", sells: "masala chai", goal: "posts" }),
    }),
  );
  assert.equal(setup.status, 200);
  const teamCount = await prisma.userAgent.count({ where: { userId: user!.id } });
  const enabled = await prisma.userAgent.count({ where: { userId: user!.id, enabled: true } });
  assert.equal(teamCount, 55);
  assert.ok(enabled > 0 && enabled < 55);
  const waiting = await prisma.approval.count({ where: { userId: user!.id, status: "pending" } });
  assert.equal(waiting, 2);

  const adminCode = await requestLoginCode("owner@adiology.io", new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.20" } }));
  assert.equal(adminCode.ok, true);
  if (!adminCode.ok) return;
  const admin = await verifyLoginCode("owner@adiology.io", adminCode.devCode!);
  assert.equal(admin.ok, true);
  if (admin.ok) assert.equal(admin.redirect, "/sup-admin");

  for (let i = 0; i < 6; i += 1) {
    await requestLoginCode(email, new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.30" } }));
  }
  const limited = await requestLoginCode(email, new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.30" } }));
  assert.equal(limited.status, 429);
});
