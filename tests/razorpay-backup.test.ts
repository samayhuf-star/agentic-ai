import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { hashSecret, randomToken } from "../lib/crypto";
import { recoveryLetter } from "../lib/followups/recovery";
import { saleKind } from "../lib/payments/confirmed";
import { markPaidViaRazorpay, razorpayBackupUrl, RAZORPAY_BACKUP_DEFAULT } from "../lib/payments/razorpay-backup";
import { POST as markRazorpay } from "../app/api/admin/payments/razorpay/route";

if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret";

const ADMIN = "razorpay-admin@example.com";
const STAFF = "razorpay-staff@example.com";
const BASE = "http://localhost:3000";

test("recovery emails include the configurable Razorpay backup link and matching note", () => {
  const prev = process.env.RAZORPAY_BACKUP_URL;
  try {
    delete process.env.RAZORPAY_BACKUP_URL;
    assert.equal(razorpayBackupUrl(), "https://rzp.io/rzp/THEAITIMEMACHINE");
    assert.equal(razorpayBackupUrl(), RAZORPAY_BACKUP_DEFAULT);
    const letter = recoveryLetter({
      orderId: "brtestorder",
      amountInr: 1999,
      name: "Asha",
      step: "r1",
      unsubscribeUrl: "http://localhost:3000/unsub",
    });
    for (const body of [letter.text, letter.html]) {
      assert.match(body, /Having trouble\? Pay with Visa\/card\/UPI via Razorpay/);
      assert.match(body, /https:\/\/rzp\.io\/rzp\/THEAITIMEMACHINE/);
      assert.doesNotMatch(body, /rzp\/vLaQY8KP/);
      assert.match(body, /same email address you used at checkout so we can match the payment/);
    }
    assert.match(letter.html, /href="https:\/\/rzp\.io\/rzp\/THEAITIMEMACHINE"/);
    assert.match(letter.text, /Complete payment \(₹1,999\): /);
    assert.match(letter.text, /\/api\/checkout\/retry\?order=brtestorder/);

    process.env.RAZORPAY_BACKUP_URL = "https://rzp.io/rzp/CUSTOMLINK";
    const custom = recoveryLetter({
      orderId: "brtestorder",
      amountInr: 1999,
      step: "r3",
      unsubscribeUrl: "http://localhost:3000/unsub",
    });
    assert.match(custom.text, /https:\/\/rzp\.io\/rzp\/CUSTOMLINK/);
    assert.doesNotMatch(custom.text, /THEAITIMEMACHINE/);
    process.env.RAZORPAY_BACKUP_URL = "not-a-url";
    assert.equal(razorpayBackupUrl(), RAZORPAY_BACKUP_DEFAULT);
  } finally {
    if (prev == null) delete process.env.RAZORPAY_BACKUP_URL;
    else process.env.RAZORPAY_BACKUP_URL = prev;
  }
});

async function withLists(run: () => Promise<void>) {
  const prevAdmin = process.env.ADMIN_EMAILS;
  const prevStaff = process.env.STAFF_EMAILS;
  process.env.ADMIN_EMAILS = ADMIN;
  process.env.STAFF_EMAILS = STAFF;
  try {
    await run();
  } finally {
    if (prevAdmin == null) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prevAdmin;
    if (prevStaff == null) delete process.env.STAFF_EMAILS;
    else process.env.STAFF_EMAILS = prevStaff;
  }
}

async function mintSession(email: string) {
  const token = randomToken();
  const user = await prisma.user.upsert({
    where: { email },
    update: { compAccess: true, onboardedAt: new Date() },
    create: { email, compAccess: true, onboardedAt: new Date() },
  });
  await prisma.session.create({
    data: { tokenHash: hashSecret(token), email, userId: user.id, isAdmin: false, expiresAt: new Date(Date.now() + 3600_000) },
  });
  return `ai_time_machine_session=${token}`;
}

function req(path: string, method: string, cookie?: string, body?: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json", host: "localhost:3000" };
  if (cookie) headers.cookie = cookie;
  return new Request(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

test("mark paid via Razorpay grants access like Cashfree, logs a SystemEvent, and does not confirm a Cashfree sale", async () => {
  const stamp = Date.now();
  const orderId = `brrzp${stamp}`;
  const email = `rzp-${stamp}@shop.test`;
  const razorpayPaymentId = `pay_Test${stamp}`;
  await prisma.payment.create({
    data: {
      id: orderId,
      gateway: "cashfree",
      amountInr: 1999,
      status: "pending",
      email,
      phone: `+919${String(stamp).slice(-9)}`,
      name: "Razorpay Buyer",
    },
  });

  const first = await markPaidViaRazorpay({ orderId, razorpayPaymentId, actor: ADMIN });
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, undefined);

  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  assert.equal(payment?.status, "paid");
  assert.equal(payment?.gateway, "razorpay");
  assert.equal(payment?.gatewayPaymentId, razorpayPaymentId);
  assert.equal(payment?.reference, razorpayPaymentId);
  assert.equal(payment?.gatewayConfirmedAt, null);
  assert.equal(payment?.capiPurchaseAt ?? null, null);
  assert.equal(saleKind(payment!), "razorpay");

  const user = await prisma.user.findUnique({ where: { email } });
  assert.ok(user);
  assert.equal(payment?.userId, user!.id);
  assert.equal(await prisma.userAgent.count({ where: { userId: user!.id } }), 55);

  const events = await prisma.systemEvent.findMany({ where: { paymentId: orderId, type: "payment.paid" } });
  assert.ok(events.some((e) => e.summary.includes("Marked paid via Razorpay") && e.summary.includes(razorpayPaymentId)));
  assert.ok(events.some((e) => e.tag === "admin" || e.dedupeKey === `payment.razorpay:${orderId}` || e.summary.includes("Marked paid via Razorpay")));

  // Google Ads / Meta purchase only fire for Cashfree-confirmed sales.
  assert.equal(payment?.gateway === "cashfree" && Boolean(payment.gatewayConfirmedAt) && !payment.isTest, false);

  const again = await markPaidViaRazorpay({ orderId, razorpayPaymentId, actor: ADMIN });
  assert.equal(again.ok, true);
  assert.equal(again.duplicate, true);
  const after = await prisma.payment.findUnique({ where: { id: orderId } });
  assert.equal(after?.gatewayConfirmedAt, null);

  const other = await markPaidViaRazorpay({ orderId, razorpayPaymentId: `pay_Other${stamp}`, actor: ADMIN });
  assert.equal(other.ok, false);
  assert.equal(other.status, 409);
});

test("already Cashfree-confirmed orders cannot be overwritten with Razorpay", async () => {
  const stamp = Date.now();
  const orderId = `brcf${stamp}`;
  await prisma.payment.create({
    data: {
      id: orderId,
      gateway: "cashfree",
      amountInr: 1999,
      status: "paid",
      email: `cf-${stamp}@shop.test`,
      paidAt: new Date(),
      gatewayConfirmedAt: new Date(),
      gatewayConfirmedVia: "webhook",
    },
  });
  const result = await markPaidViaRazorpay({ orderId, razorpayPaymentId: `pay_No${stamp}`, actor: ADMIN });
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  assert.equal(payment?.gateway, "cashfree");
  assert.ok(payment?.gatewayConfirmedAt);
});

test("mark paid via Razorpay API is admin-only", async () => {
  await withLists(async () => {
    const body = { orderId: "brmissing", razorpayPaymentId: "pay_abc123" };
    assert.equal((await markRazorpay(req("/api/admin/payments/razorpay", "POST", undefined, body))).status, 401);
    const staff = await mintSession(STAFF);
    assert.equal((await markRazorpay(req("/api/admin/payments/razorpay", "POST", staff, body))).status, 403);
  });
});
