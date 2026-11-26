import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { deliverOwnerAlert } from "../lib/alerts/notify";
import { runFollowups } from "../lib/followups/run";
import { POST as followups } from "../app/api/jobs/followups/route";

process.env.AUTH_SECRET = "test-secret";
process.env.APP_URL = "http://localhost:3000";

test("owner payment alerts send once per order", async () => {
  process.env.OWNER_ALERT_EMAILS = "alerts@example.com";
  process.env.WHATSAPP_PROVIDER = "none";
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_FROM = "AI Time Machine <no-reply@adiology.io>";
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const input = {
      kind: "payment_received" as const,
      dedupeKey: `payment_received:order-alert-${Date.now()}`,
      name: "Chai and Co",
      email: "buyer@shop.test",
      phone: "+919999900000",
      amountInr: 1999,
      orderId: `order-alert-${Date.now()}`,
      status: "paid",
    };
    await deliverOwnerAlert(input);
    await deliverOwnerAlert(input);
    assert.equal(calls, 1);
    const rows = await prisma.alertLog.findMany({ where: { dedupeKey: input.dedupeKey } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "sent");
    assert.equal(rows[0].channel, "email");
    assert.match(rows[0].subject, /Payment received/);
    assert.match(rows[0].subject, /₹1,999/);
    assert.match(rows[0].body, /sup-admin/);
  } finally {
    globalThis.fetch = original;
    delete process.env.RESEND_API_KEY;
    delete process.env.OWNER_ALERT_EMAILS;
  }
});

test("follow-up notes send once and stop after payment or unsubscribe", async () => {
  delete process.env.RECOVERY_EMAILS;
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_FROM = "AI Time Machine <no-reply@adiology.io>";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;
  const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const stamp = Date.now();
  const lead = await prisma.lead.create({
    data: { orderId: `lead-${stamp}`, email: `wait-${stamp}@shop.test`, amountInr: 1999, status: "pending", createdAt: old },
  });
  try {
    await runFollowups();
    await runFollowups();
    assert.equal(await prisma.followupSend.count({ where: { leadId: lead.id, step: "checkout_1h" } }), 1);
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "paid", paidAt: new Date() } });
    await runFollowups();
    assert.equal(await prisma.followupSend.count({ where: { leadId: lead.id } }), 1);

    const phone = `7${String(Date.now()).slice(-9)}`;
    const user = await prisma.user.create({
      data: {
        phone: `+91${phone}`,
        email: `paid-wait-${stamp}@shop.test`,
        payments: { create: { id: `pay-${Date.now()}`, gateway: "cashfree", amountInr: 1999, status: "paid", paidAt: old } },
      },
    });
    await runFollowups();
    assert.equal(await prisma.followupSend.count({ where: { toEmail: user.email! } }), 1);
    await prisma.user.update({ where: { id: user.id }, data: { marketingOptOut: true } });
    await runFollowups();
    assert.equal(await prisma.followupSend.count({ where: { toEmail: user.email! } }), 1);

    process.env.CRON_SECRET = "cron-test";
    const denied = await followups(new Request("http://localhost/api/jobs/followups", { method: "POST" }));
    assert.equal(denied.status, 401);
    const allowed = await followups(
      new Request("http://localhost/api/jobs/followups", { method: "POST", headers: { "x-cron-secret": "cron-test" } }),
    );
    assert.equal(allowed.status, 200);
  } finally {
    globalThis.fetch = original;
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  }
});


test("recovery sequence stops the older checkout is still open emails", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_FROM = "AI Time Machine <no-reply@adiology.io>";
  process.env.RECOVERY_EMAILS = "on";
  process.env.RECOVERY_CUTOFF = "2026-11-26T07:40:00Z";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;
  const stamp = Date.now();
  const covered = await prisma.lead.create({
    data: {
      orderId: `lead-new-${stamp}`,
      email: `new-${stamp}@shop.test`,
      amountInr: 1999,
      status: "pending",
      createdAt: new Date("2026-11-26T10:00:00Z"),
    },
  });
  const older = await prisma.lead.create({
    data: {
      orderId: `lead-old-${stamp}`,
      email: `old-${stamp}@shop.test`,
      amountInr: 1999,
      status: "pending",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });
  try {
    // Make the "older" lead also older than 1 hour but before cutoff if now is after cutoff.
    // If "older" is actually after cutoff (today), force it before cutoff.
    const cutoff = new Date("2026-11-26T07:40:00Z");
    if (older.createdAt >= cutoff) {
      await prisma.lead.update({
        where: { id: older.id },
        data: { createdAt: new Date(cutoff.getTime() - 2 * 60 * 60 * 1000) },
      });
    }
    await runFollowups();
    assert.equal(await prisma.followupSend.count({ where: { leadId: covered.id } }), 0);
    assert.equal(await prisma.followupSend.count({ where: { leadId: older.id, step: "checkout_1h" } }), 1);
  } finally {
    globalThis.fetch = original;
    delete process.env.RESEND_API_KEY;
    delete process.env.RECOVERY_EMAILS;
    delete process.env.RECOVERY_CUTOFF;
  }
});

test("recovery starts 15 minutes after an unpaid checkout and not before", async () => {
  const { runRecovery, DROPPED_AFTER } = await import("../lib/followups/recovery");
  assert.equal(DROPPED_AFTER, 15 * 60 * 1000);
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_FROM = "AI Time Machine <no-reply@adiology.io>";
  process.env.RECOVERY_EMAILS = "on";
  process.env.RECOVERY_CUTOFF = "2026-11-20T00:00:00Z";
  const original = globalThis.fetch;
  const sent: string[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || "{}")) as { subject?: string; to?: string };
    if (body.subject) sent.push(body.subject);
    return new Response(JSON.stringify({ id: "re_test_id" }), { status: 200 });
  }) as typeof fetch;
  const stamp = Date.now();
  const ripeEmail = `ripe-${stamp}@shop.test`;
  const freshEmail = `fresh-${stamp}@shop.test`;
  await prisma.payment.create({
    data: {
      id: `brripe${stamp}`,
      gateway: "cashfree",
      amountInr: 1999,
      status: "pending",
      email: ripeEmail,
      name: "Ripe",
      createdAt: new Date(Date.now() - 16 * 60 * 1000),
    },
  });
  await prisma.payment.create({
    data: {
      id: `brfresh${stamp}`,
      gateway: "cashfree",
      amountInr: 1999,
      status: "pending",
      email: freshEmail,
      name: "Fresh",
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
    },
  });
  try {
    const first = await runRecovery();
    assert.ok(first.sent >= 1);
    assert.equal(await prisma.followupSend.count({ where: { key: `recovery:${ripeEmail}:r1` } }), 1);
    assert.equal(await prisma.followupSend.count({ where: { key: `recovery:${freshEmail}:r1` } }), 0);
    assert.ok(sent.some((s) => s.includes("did not go through")));
    const again = await runRecovery();
    assert.equal(again.sent, 0);
  } finally {
    globalThis.fetch = original;
    delete process.env.RESEND_API_KEY;
    delete process.env.RECOVERY_EMAILS;
    delete process.env.RECOVERY_CUTOFF;
  }
});
