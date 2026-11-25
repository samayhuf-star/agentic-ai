import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import { getSessionFromToken, requestLoginCode } from "../lib/auth";
import { hashSecret, randomToken } from "../lib/crypto";
import { POST as createCustomer } from "../app/api/admin/customers/route";
import { DELETE as deleteCustomer, PATCH as patchCustomer } from "../app/api/admin/customers/[id]/route";
import { POST as createPayment } from "../app/api/admin/payments/route";
import { DELETE as deletePayment, PATCH as patchPayment } from "../app/api/admin/payments/[id]/route";
import { PATCH as patchAgent } from "../app/api/admin/agents/[id]/route";

if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret";

const ADMIN = "console-admin@example.com";
const STAFF = "console-staff@example.com";
const BUYER = "console-buyer@example.com";
const BASE = "http://localhost:3000";

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

function req(path: string, method: string, cookie?: string, body?: unknown, origin?: string) {
  const headers: Record<string, string> = { "content-type": "application/json", host: "localhost:3000" };
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  return new Request(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { email: BUYER } });
  if (user) {
    await prisma.payment.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.payment.deleteMany({ where: { email: BUYER } });
}

test("admin console routes reject signed-out (401), staff and customers (403), and cross-site posts", async () => {
  await withLists(async () => {
    await cleanup();
    const body = { name: "X", email: BUYER, access: "none" };
    assert.equal((await createCustomer(req("/api/admin/customers", "POST", undefined, body))).status, 401);
    assert.equal((await patchCustomer(req("/api/admin/customers/x", "PATCH", undefined, {}), params("x"))).status, 401);
    assert.equal((await deleteCustomer(req("/api/admin/customers/x", "DELETE", undefined, {}), params("x"))).status, 401);
    assert.equal((await createPayment(req("/api/admin/payments", "POST", undefined, {}))).status, 401);
    assert.equal((await patchPayment(req("/api/admin/payments/x", "PATCH", undefined, {}), params("x"))).status, 401);
    assert.equal((await deletePayment(req("/api/admin/payments/x", "DELETE", undefined, {}), params("x"))).status, 401);
    assert.equal((await patchAgent(req("/api/admin/agents/x", "PATCH", undefined, {}), params("x"))).status, 401);

    const staff = await mintSession(STAFF);
    assert.equal((await createCustomer(req("/api/admin/customers", "POST", staff, body))).status, 403);
    assert.equal((await createPayment(req("/api/admin/payments", "POST", staff, {}))).status, 403);

    const customer = await mintSession("console-random@example.com");
    assert.equal((await createCustomer(req("/api/admin/customers", "POST", customer, body))).status, 403);

    const admin = await mintSession(ADMIN);
    assert.equal((await createCustomer(req("/api/admin/customers", "POST", admin, body, "https://evil.example"))).status, 403);
    assert.equal(await prisma.user.count({ where: { email: BUYER } }), 0);
  });
});

test("admin creates a paid customer, edits, suspends, records/edits/deletes payments, then deletes the customer", async () => {
  await withLists(async () => {
    await cleanup();
    const admin = await mintSession(ADMIN);

    const bad = await createCustomer(req("/api/admin/customers", "POST", admin, { name: "", email: "nope", access: "paid" }));
    assert.equal(bad.status, 400);

    const created = await createCustomer(
      req("/api/admin/customers", "POST", admin, { name: "Console Buyer", email: BUYER, phone: "9876501234", access: "paid", amount: 1999, method: "upi", reference: "UTR123" }, BASE),
    );
    assert.equal(created.status, 201);
    const { id, paymentId } = (await created.json()) as { id: string; paymentId: string };
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    assert.equal(payment.status, "paid");
    assert.equal(payment.gateway, "manual");
    assert.equal(payment.amountInr, 1999);
    assert.ok(payment.paidAt);

    const dup = await createCustomer(req("/api/admin/customers", "POST", admin, { name: "Dup", email: BUYER, access: "none" }));
    assert.equal(dup.status, 400);

    // A paid manual payment lets them request a sign-in code.
    const login = await requestLoginCode(BUYER, new Request(`${BASE}/api/auth/request-code`, { headers: { "x-forwarded-for": "10.9.9.9" } }));
    assert.equal(login.ok, true);

    const edit = await patchCustomer(req(`/api/admin/customers/${id}`, "PATCH", admin, { businessName: "Buyer Co", notes: "VIP", phone: "9876501234" }), params(id));
    assert.equal(edit.status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id } })).businessName, "Buyer Co");

    // Suspend blocks sign-in and kills existing sessions.
    const token = randomToken();
    await prisma.session.create({ data: { tokenHash: hashSecret(token), email: BUYER, userId: id, expiresAt: new Date(Date.now() + 3600_000) } });
    assert.equal((await patchCustomer(req(`/api/admin/customers/${id}`, "PATCH", admin, { action: "suspend" }), params(id))).status, 200);
    assert.equal(await getSessionFromToken(token), null);
    const blocked = await requestLoginCode(BUYER, new Request(`${BASE}/api/auth/request-code`, { headers: { "x-forwarded-for": "10.9.9.8" } }));
    assert.equal(blocked.ok, false);
    assert.equal((await patchCustomer(req(`/api/admin/customers/${id}`, "PATCH", admin, { action: "activate" }), params(id))).status, 200);

    // Extra manual payment, edit status, delete.
    const added = await createPayment(req("/api/admin/payments", "POST", admin, { customerEmail: BUYER, amount: 500, status: "pending", method: "cash" }));
    assert.equal(added.status, 201);
    const extraId = ((await added.json()) as { id: string }).id;
    assert.equal((await patchPayment(req(`/api/admin/payments/${extraId}`, "PATCH", admin, { status: "refunded" }), params(extraId))).status, 200);
    const refunded = await prisma.payment.findUniqueOrThrow({ where: { id: extraId } });
    assert.equal(refunded.status, "refunded");
    assert.equal(refunded.refundedBy, ADMIN);
    assert.equal((await patchPayment(req(`/api/admin/payments/${extraId}`, "PATCH", admin, { status: "bogus" }), params(extraId))).status, 400);
    assert.equal((await deletePayment(req(`/api/admin/payments/${extraId}`, "DELETE", admin, { confirm: "wrong" }), params(extraId))).status, 400);
    assert.equal((await deletePayment(req(`/api/admin/payments/${extraId}`, "DELETE", admin, { confirm: extraId }), params(extraId))).status, 200);

    // Gateway payments cannot be deleted.
    await prisma.payment.create({ data: { id: "console_gw_1", gateway: "cashfree", amountInr: 1999, status: "paid", email: BUYER, userId: id } });
    assert.equal((await deletePayment(req("/api/admin/payments/console_gw_1", "DELETE", admin, { confirm: "console_gw_1" }), params("console_gw_1"))).status, 400);
    assert.equal((await patchPayment(req("/api/admin/payments/console_gw_1", "PATCH", admin, { amount: 1 }), params("console_gw_1"))).status, 400);

    // Delete customer keeps payments, unlinked.
    assert.equal((await deleteCustomer(req(`/api/admin/customers/${id}`, "DELETE", admin, { confirm: "nope" }), params(id))).status, 400);
    assert.equal((await deleteCustomer(req(`/api/admin/customers/${id}`, "DELETE", admin, { confirm: BUYER }), params(id))).status, 200);
    assert.equal(await prisma.user.count({ where: { id } }), 0);
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).userId, null);

    const actions = (await prisma.adminAudit.findMany({ where: { actorEmail: ADMIN } })).map((row) => row.action);
    for (const action of ["customer.create", "payment.create", "customer.update", "customer.suspend", "customer.activate", "payment.update", "payment.delete", "customer.delete"]) {
      assert.ok(actions.includes(action), `audit has ${action}`);
    }
    await prisma.payment.deleteMany({ where: { email: BUYER } });
  });
});

test("admin and staff accounts cannot be suspended or deleted from the console", async () => {
  await withLists(async () => {
    const admin = await mintSession(ADMIN);
    await mintSession(STAFF);
    const staffUser = await prisma.user.findUniqueOrThrow({ where: { email: STAFF } });
    assert.equal((await patchCustomer(req(`/api/admin/customers/${staffUser.id}`, "PATCH", admin, { action: "suspend" }), params(staffUser.id))).status, 400);
    assert.equal((await deleteCustomer(req(`/api/admin/customers/${staffUser.id}`, "DELETE", admin, { confirm: STAFF }), params(staffUser.id))).status, 400);
  });
});
