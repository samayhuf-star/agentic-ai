import assert from "node:assert/strict";
import test from "node:test";
import { eventTag, logEvent } from "../lib/activity/log";
import { backfillSystemEvents } from "../lib/activity/backfill";
import { attemptsFromCashfreePayload } from "../lib/payments/cashfree-order";
import { prisma } from "../lib/prisma";

if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret";

const EMAIL = "activity-buyer@not-internal.example";

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  await prisma.systemEvent.deleteMany({
    where: { OR: [{ email: EMAIL }, { paymentId: { startsWith: "bract" } }, { dedupeKey: { startsWith: "signup:act-test" } }] },
  });
  if (user) {
    await prisma.payment.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.payment.deleteMany({ where: { email: EMAIL } });
}

test("event tags mark admin and test, not real customers", () => {
  assert.equal(eventTag({ email: "samay@krosz.com" }), "admin");
  assert.equal(eventTag({ email: EMAIL, isTest: true }), "test");
  assert.equal(eventTag({ email: EMAIL }), null);
});

test("Cashfree attempt parser keeps method, USER_DROPPED and failure reason", () => {
  const rows = attemptsFromCashfreePayload({
    data: [
      {
        cf_payment_id: "123",
        payment_status: "SUCCESS",
        payment_amount: 1999,
        payment_group: "upi",
        payment_time: "2026-11-26T10:00:00+05:30",
      },
      {
        cf_payment_id: "124",
        payment_status: "USER_DROPPED",
        payment_amount: 1999,
        payment_method: { netbanking: {} },
        payment_message: "User dropped",
      },
      {
        cf_payment_id: "125",
        payment_status: "FAILED",
        payment_amount: 1999,
        payment_group: "cc",
        error_details: { error_description: "Insufficient funds" },
      },
    ],
  });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].status, "SUCCESS");
  assert.equal(rows[0].method, "upi");
  assert.equal(rows[1].status, "USER_DROPPED");
  assert.equal(rows[1].method, "netbanking");
  assert.equal(rows[2].status, "FAILED");
  assert.equal(rows[2].error, "Insufficient funds");
});

test("logEvent is append-only, dedupes, and never stores email bodies or OTP codes", async () => {
  await cleanup();
  await logEvent({
    type: "email.sent",
    email: EMAIL,
    summary: "Email to activity-buyer@not-internal.example: Your AI Time Machine code",
    detail: "via mock",
    dedupeKey: "email.sent:act-test-1",
  });
  await logEvent({
    type: "email.sent",
    email: EMAIL,
    summary: "duplicate should be ignored",
    detail: "Your AI Time Machine code is 123456. It expires in 10 minutes.",
    dedupeKey: "email.sent:act-test-1",
  });
  const rows = await prisma.systemEvent.findMany({ where: { dedupeKey: "email.sent:act-test-1" } });
  assert.equal(rows.length, 1);
  assert.match(rows[0].summary, /Your AI Time Machine code/);
  assert.equal(rows[0].detail, "via mock");
  assert.ok(!/123456/.test(`${rows[0].summary} ${rows[0].detail || ""}`));
  await cleanup();
});

test("backfill writes signup and checkout once, and tags staff rows", async () => {
  await cleanup();
  const user = await prisma.user.create({ data: { email: EMAIL } });
  const payment = await prisma.payment.create({
    data: { id: "bracttest00000001", gateway: "cashfree", amountInr: 1999, status: "pending", email: EMAIL, userId: user.id },
  });
  await backfillSystemEvents({ cashfree: false });
  await backfillSystemEvents({ cashfree: false });
  const signups = await prisma.systemEvent.findMany({ where: { dedupeKey: `signup:${user.id}` } });
  const checkouts = await prisma.systemEvent.findMany({ where: { dedupeKey: `checkout:${payment.id}` } });
  assert.equal(signups.length, 1);
  assert.equal(checkouts.length, 1);
  assert.equal(signups[0].tag, null);
  assert.match(checkouts[0].summary, /bracttest00000001/);
  assert.equal(checkouts[0].amountInr, 1999);
  await cleanup();
});
