import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { resolveAccessRole } from "../lib/config";
import { requestLoginCode, verifyLoginCode } from "../lib/auth";
import { hashSecret, randomToken } from "../lib/crypto";
import { customerSnapshot, funnelSnapshot, overviewSignupCount } from "../lib/admin/stats";
import { readStatsRange } from "../lib/admin/range";
import { getActiveGateway } from "../lib/settings";
import { POST as refund } from "../app/api/admin/refund/route";
import { POST as gateway } from "../app/api/admin/gateway/route";
import { GET as csv } from "../app/api/admin/stats/orders.csv/route";
import { POST as testPayment } from "../app/api/admin/test-payment/route";
import { POST as fulfil } from "../app/api/admin/fulfil/route";
import { POST as resendWelcome } from "../app/api/admin/resend-welcome/route";
import { POST as testEmail } from "../app/api/admin/test-email/route";
import { POST as testAlert } from "../app/api/admin/test-alert/route";

if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret";

async function withLists(admin: string, staff: string, run: () => Promise<void>) {
  const prevAdmin = process.env.ADMIN_EMAILS;
  const prevStaff = process.env.STAFF_EMAILS;
  process.env.ADMIN_EMAILS = admin;
  process.env.STAFF_EMAILS = staff;
  try {
    await run();
  } finally {
    if (prevAdmin == null) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prevAdmin;
    if (prevStaff == null) delete process.env.STAFF_EMAILS;
    else process.env.STAFF_EMAILS = prevStaff;
  }
}

async function removeUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.payment.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

async function mintSession(email: string, isAdmin: boolean) {
  const token = randomToken();
  const user = await prisma.user.upsert({
    where: { email },
    update: { compAccess: true, onboardedAt: new Date() },
    create: { email, compAccess: true, onboardedAt: new Date() },
  });
  await prisma.session.create({
    data: {
      tokenHash: hashSecret(token),
      email,
      userId: user.id,
      isAdmin,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return { cookie: `ai_time_machine_session=${token}`, user };
}

function authed(url: string, cookie: string, body?: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { cookie, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("access role is admin, staff, customer, or none", async () => {
  await withLists("Owner@Adiology.io, both@example.com", "staff@example.com, Both@Example.com", async () => {
    assert.equal(resolveAccessRole("owner@adiology.io"), "admin");
    assert.equal(resolveAccessRole("  BOTH@example.com ", true), "admin");
    assert.equal(resolveAccessRole("staff@example.com", true), "staff");
    assert.equal(resolveAccessRole("STAFF@example.com"), "staff");
    assert.equal(resolveAccessRole("buyer@shop.test", true), "customer");
    assert.equal(resolveAccessRole("buyer@shop.test", false), "none");
    assert.equal(resolveAccessRole(""), "none");
    assert.equal(resolveAccessRole(null), "none");
  });
});

test("staff can sign in without a payment, and an email on both lists is an admin", async () => {
  const staffEmail = "role-staff@example.com";
  const bothEmail = "role-both@example.com";
  const stranger = "role-stranger@example.com";
  await withLists(`${bothEmail}, role-admin@example.com`, `${staffEmail}, ${bothEmail}`, async () => {
    await prisma.rateLimit.deleteMany({
      where: { id: { in: [`otp:email:${staffEmail}`, `otp:email:${bothEmail}`, `otp:email:${stranger}`, "otp:ip:203.0.113.90", "otp:ip:203.0.113.91", "otp:ip:203.0.113.92"] } },
    });
    await removeUser(staffEmail);
    await removeUser(bothEmail);
    const blocked = await requestLoginCode(stranger, new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.90" } }));
    assert.equal(blocked.status, 403);

    const staffCode = await requestLoginCode(staffEmail, new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.91" } }));
    assert.equal(staffCode.ok, true);
    if (!staffCode.ok) return;
    const staff = await verifyLoginCode(staffEmail, staffCode.devCode || "");
    assert.equal(staff.ok, true);
    if (!staff.ok) return;
    assert.equal(staff.isAdmin, false);
    assert.equal(staff.redirect, "/sup-admin");
    const staffUser = await prisma.user.findUnique({ where: { email: staffEmail }, include: { payments: true } });
    assert.equal(staffUser?.compAccess, true);
    assert.equal(staffUser?.payments.length, 0);

    const bothCode = await requestLoginCode("Role-Both@Example.com", new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.92" } }));
    assert.equal(bothCode.ok, true);
    if (!bothCode.ok) return;
    const both = await verifyLoginCode(bothEmail, bothCode.devCode || "");
    assert.equal(both.ok, true);
    if (!both.ok) return;
    assert.equal(both.isAdmin, true);
    assert.equal(both.redirect, "/dashboard");
  });
});

test("staff receive 403 on every admin change, and an admin email still can refund", async () => {
  const staffEmail = "mutation-staff@example.com";
  const adminEmail = "mutation-both@example.com";
  const orderId = `staff-role-${Date.now()}`;
  await withLists(adminEmail, staffEmail, async () => {
    const staff = await mintSession(staffEmail, false);
    const flagged = await mintSession(staffEmail, true);
    const admin = await mintSession(adminEmail, false);
    await prisma.payment.deleteMany({ where: { id: orderId } });
    await prisma.payment.create({
      data: { id: orderId, gateway: "cashfree", amountInr: 1999, status: "paid", email: "buyer-live@example.com", isTest: false },
    });
    const gatewayBefore = await getActiveGateway();
    const nextGateway = gatewayBefore === "payu" ? "cashfree" : "payu";
    const calls: Array<{ name: string; run: (cookie: string) => Promise<Response> }> = [
      { name: "refund", run: (cookie) => refund(authed("http://localhost/api/admin/refund", cookie, { orderId })) },
      { name: "gateway", run: (cookie) => gateway(authed("http://localhost/api/admin/gateway", cookie, { gateway: nextGateway })) },
      { name: "csv", run: (cookie) => csv(authed("http://localhost/api/admin/stats/orders.csv", cookie, undefined, "GET")) },
      { name: "test-payment", run: (cookie) => testPayment(authed("http://localhost/api/admin/test-payment", cookie, { orderId, isTest: true })) },
      { name: "fulfil", run: (cookie) => fulfil(authed("http://localhost/api/admin/fulfil", cookie, { orderId, email: "buyer-live@example.com" })) },
      { name: "resend-welcome", run: (cookie) => resendWelcome(authed("http://localhost/api/admin/resend-welcome", cookie, { userId: staff.user.id })) },
      { name: "test-email", run: (cookie) => testEmail(authed("http://localhost/api/admin/test-email", cookie, { to: staffEmail })) },
      { name: "test-alert", run: (cookie) => testAlert(authed("http://localhost/api/admin/test-alert", cookie, {})) },
    ];
    try {
      for (const item of calls) {
        const response = await item.run(staff.cookie);
        assert.equal(response.status, 403, item.name);
      }
      const flaggedRefund = await refund(authed("http://localhost/api/admin/refund", flagged.cookie, { orderId }));
      assert.equal(flaggedRefund.status, 403);
      const untouched = await prisma.payment.findUnique({ where: { id: orderId } });
      assert.equal(untouched?.status, "paid");
      assert.equal(untouched?.isTest, false);
      assert.equal(await getActiveGateway(), gatewayBefore);

      const adminRefund = await refund(authed("http://localhost/api/admin/refund", admin.cookie, { orderId }));
      assert.equal(adminRefund.status, 200);
      assert.equal((await prisma.payment.findUnique({ where: { id: orderId } }))?.status, "refunded");
      const adminCsv = await csv(authed("http://localhost/api/admin/stats/orders.csv", admin.cookie, undefined, "GET"));
      assert.equal(adminCsv.status, 200);
      assert.match(adminCsv.headers.get("content-type") || "", /text\/csv/);
    } finally {
      await prisma.payment.deleteMany({ where: { id: orderId } });
      await removeUser(staffEmail);
      await removeUser(adminEmail);
    }
  });
});

test("admin and staff emails stay out of customer signups and the funnel", async () => {
  const adminEmail = "metric-admin@example.com";
  const staffEmail = "metric-staff@example.com";
  const buyerEmail = "metric-buyer@example.com";
  const ids = ["metric-admin-pay", "metric-staff-pay", "metric-buyer-pay"];
  const at = new Date(Date.UTC(2031, 5, 15, 6, 30, 0));
  await withLists(adminEmail, staffEmail, async () => {
    await prisma.payment.deleteMany({ where: { id: { in: ids } } });
    await removeUser(adminEmail);
    await removeUser(staffEmail);
    await removeUser(buyerEmail);
    try {
      const before = await overviewSignupCount();
      const admin = await prisma.user.create({ data: { email: adminEmail, compAccess: false, createdAt: at } });
      const staff = await prisma.user.create({ data: { email: staffEmail, compAccess: false, createdAt: at } });
      await prisma.user.create({ data: { email: buyerEmail, compAccess: false, createdAt: at } });
      assert.equal((await overviewSignupCount()) - before, 1);

      const buyer = await prisma.user.findUniqueOrThrow({ where: { email: buyerEmail } });
      await prisma.payment.createMany({
        data: [
          { id: ids[0], gateway: "cashfree", amountInr: 1999, status: "paid", email: adminEmail, userId: admin.id, paidAt: at, createdAt: at, gatewayConfirmedAt: at },
          { id: ids[1], gateway: "cashfree", amountInr: 1999, status: "paid", email: staffEmail, userId: staff.id, paidAt: at, createdAt: at, gatewayConfirmedAt: at },
          { id: ids[2], gateway: "cashfree", amountInr: 1999, status: "paid", email: buyerEmail, userId: buyer.id, paidAt: at, createdAt: at, gatewayConfirmedAt: at },
        ],
      });
      await prisma.session.createMany({
        data: [adminEmail, staffEmail, buyerEmail].map((email, index) => ({
          tokenHash: hashSecret(`metric-${email}-${Date.now()}`),
          email,
          userId: index === 0 ? admin.id : index === 1 ? staff.id : buyer.id,
          isAdmin: index === 0,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        })),
      });
      const range = readStatsRange({ range: "custom", from: "2031-06-15", to: "2031-06-15" });
      const customers = await customerSnapshot(range);
      const funnel = await funnelSnapshot(range);
      assert.equal(customers.signups, 1);
      assert.equal(funnel.find((step) => step.label === "Checkout submitted")?.count, 1);
      assert.equal(funnel.find((step) => step.label === "Paid")?.count, 1);
      assert.equal(funnel.find((step) => step.label === "First login")?.count, 1);
    } finally {
      await prisma.payment.deleteMany({ where: { id: { in: ids } } });
      await removeUser(adminEmail);
      await removeUser(staffEmail);
      await removeUser(buyerEmail);
    }
  });
});

test("concurrent first loads seed 55 agents without a unique-constraint error", async () => {
  const email = `seed-${Date.now()}@shop.test`;
  const user = await prisma.user.create({ data: { email, compAccess: true, onboardedAt: new Date() } });
  const { ensureTeam } = await import("../lib/team");
  const { agents } = await import("../data/agents");
  const userAgents = prisma.userAgent as unknown as {
    count: (args?: { where?: { userId?: string } }) => Promise<number>;
  };
  const catalog = prisma.agent as unknown as { count: () => Promise<number> };
  const originalMembers = userAgents.count.bind(prisma.userAgent);
  const originalCatalog = catalog.count.bind(prisma.agent);
  let memberForced = 0;
  let catalogForced = 0;
  userAgents.count = async (args) => {
    const real = await originalMembers(args);
    if (args?.where?.userId === user.id && memberForced < 2) {
      memberForced += 1;
      return 0;
    }
    return real;
  };
  catalog.count = async () => {
    catalogForced += 1;
    if (catalogForced <= 2) return 0;
    return originalCatalog();
  };
  try {
    await Promise.all([ensureTeam(user.id), ensureTeam(user.id)]);
    assert.equal(memberForced, 2);
    assert.ok(catalogForced >= 2);
    assert.equal(await originalMembers({ where: { userId: user.id } }), agents.length);
    assert.equal(await originalCatalog(), agents.length);
    await Promise.all([ensureTeam(user.id), ensureTeam(user.id)]);
    assert.equal(await originalMembers({ where: { userId: user.id } }), agents.length);
  } finally {
    userAgents.count = originalMembers;
    catalog.count = originalCatalog;
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  }
});
