import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requestLoginCode, verifyLoginCode } from "../lib/auth";
import { loginOptions, verifyLoginPin } from "../lib/auth-pin";
import { applyMarketingToUser } from "../lib/marketing/server";
import { encodeMarketing, MT_COOKIE } from "../lib/marketing/touch";

if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret";

const TEST_PIN = "123456";
const WRONG_PIN = "000000";

async function withAdmin(email: string, run: () => Promise<void>) {
  const prevAdmin = process.env.ADMIN_EMAILS;
  const prevHash = process.env.LOGIN_PIN_HASH;
  const prevEmail = process.env.LOGIN_PIN_EMAIL;
  process.env.ADMIN_EMAILS = email;
  try {
    await run();
  } finally {
    if (prevAdmin == null) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prevAdmin;
    if (prevHash == null) delete process.env.LOGIN_PIN_HASH;
    else process.env.LOGIN_PIN_HASH = prevHash;
    if (prevEmail == null) delete process.env.LOGIN_PIN_EMAIL;
    else process.env.LOGIN_PIN_EMAIL = prevEmail;
  }
}

async function removeUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.payment.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

async function clearPinLimit(email: string) {
  await prisma.rateLimit.deleteMany({ where: { id: `pin:email:${email}` } });
}

test("an account with a PIN hash can sign in, and a wrong PIN is rejected and then locked", async () => {
  const email = "pin-admin@example.com";
  await withAdmin(email, async () => {
    delete process.env.LOGIN_PIN_HASH;
    delete process.env.LOGIN_PIN_EMAIL;
    await removeUser(email);
    await clearPinLimit(email);
    const pinHash = await bcrypt.hash(TEST_PIN, 4);
    await prisma.user.create({ data: { email, compAccess: true, onboardedAt: new Date(), pinHash } });

    const options = await loginOptions(email);
    assert.equal(options.ok, true);
    assert.equal(options.pin, true);
    const stranger = await loginOptions("no-pin@example.com");
    assert.equal(stranger.ok, true);
    assert.equal(stranger.pin, false);

    const denied = await verifyLoginPin(email, WRONG_PIN);
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.equal(denied.status, 400);
    assert.match(denied.message, /not right/i);

    const signedIn = await verifyLoginPin(email, TEST_PIN);
    assert.equal(signedIn.ok, true);
    if (!signedIn.ok) return;
    assert.equal(signedIn.redirect, "/sup-admin");
    assert.equal(signedIn.isAdmin, true);
    const session = await prisma.session.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    assert.ok(session);
    assert.equal(session?.isAdmin, true);

    const success = await prisma.systemEvent.findFirst({ where: { type: "login", email, status: "admin" }, orderBy: { createdAt: "desc" } });
    assert.equal(success?.detail, "pin");
    assert.match(success?.summary || "", /signed in/);
    const failed = await prisma.systemEvent.findFirst({ where: { type: "login", email, status: "failed" }, orderBy: { createdAt: "desc" } });
    assert.match(failed?.summary || "", /failed/);

    await clearPinLimit(email);
    for (let i = 0; i < 5; i += 1) {
      const attempt = await verifyLoginPin(email, WRONG_PIN);
      assert.equal(attempt.ok, false);
      if (attempt.ok) return;
      assert.equal(attempt.status, 400);
    }
    const lockedWrong = await verifyLoginPin(email, WRONG_PIN);
    assert.equal(lockedWrong.ok, false);
    if (lockedWrong.ok) return;
    assert.equal(lockedWrong.status, 429);
    const lockedRight = await verifyLoginPin(email, TEST_PIN);
    assert.equal(lockedRight.ok, false);
    if (lockedRight.ok) return;
    assert.equal(lockedRight.status, 429);
    const lockedEvent = await prisma.systemEvent.findFirst({ where: { type: "login", email, status: "locked" }, orderBy: { createdAt: "desc" } });
    assert.match(lockedEvent?.summary || "", /locked/);
  });
});

test("a hashed env PIN works for the configured email, and other users still use the email code", async () => {
  const email = "pin-env@example.com";
  const other = "pin-otp@example.com";
  await withAdmin(`${email},${other}`, async () => {
    process.env.LOGIN_PIN_EMAIL = email;
    process.env.LOGIN_PIN_HASH = await bcrypt.hash(TEST_PIN, 4);
    await removeUser(email);
    await removeUser(other);
    await clearPinLimit(email);
    await prisma.rateLimit.deleteMany({ where: { id: { in: [`otp:email:${other}`, "otp:ip:203.0.113.201"] } } });

    const options = await loginOptions(email);
    assert.equal(options.pin, true);
    const otherOptions = await loginOptions(other);
    assert.equal(otherOptions.pin, false);

    const noPin = await verifyLoginPin(other, TEST_PIN);
    assert.equal(noPin.ok, false);
    if (noPin.ok) return;
    assert.equal(noPin.status, 400);
    assert.match(noPin.message, /email code/i);

    const signedIn = await verifyLoginPin(email, TEST_PIN);
    assert.equal(signedIn.ok, true);
    if (!signedIn.ok) return;
    assert.equal(signedIn.redirect, "/sup-admin");

    const mailed = await requestLoginCode(other, new Request("http://localhost/api/auth/request-code", { headers: { "x-forwarded-for": "203.0.113.201" } }));
    assert.equal(mailed.ok, true);
    if (!mailed.ok) return;
    assert.ok(mailed.devCode);
    const verified = await verifyLoginCode(other, mailed.devCode || "");
    assert.equal(verified.ok, true);
    if (!verified.ok) return;
    assert.equal(verified.redirect, "/dashboard");
  });
});

test("PIN sign-in sends an admin to /sup-admin, honors a safe next path, and survives an ads cookie", async () => {
  const email = "pin-sup-admin@example.com";
  await withAdmin(email, async () => {
    delete process.env.LOGIN_PIN_HASH;
    delete process.env.LOGIN_PIN_EMAIL;
    await removeUser(email);
    await clearPinLimit(email);
    const pinHash = await bcrypt.hash(TEST_PIN, 4);
    await prisma.user.create({ data: { email, compAccess: true, onboardedAt: new Date(), pinHash } });

    const cookie = encodeMarketing({
      f: { s: "google", m: "cpc", g: "Cj0TESTCLICK", p: "/", at: Math.floor(Date.now() / 1000) },
      l: { s: "google", m: "cpc", g: "Cj0TESTCLICK", p: "/sup-admin", at: Math.floor(Date.now() / 1000) },
    });
    const request = new Request("https://www.theaitimemachine.com/api/auth/verify-pin", {
      method: "POST",
      headers: { cookie: `${MT_COOKIE}=${cookie}`, "x-forwarded-host": "www.theaitimemachine.com" },
    });
    const signedIn = await verifyLoginPin(email, TEST_PIN, request);
    assert.equal(signedIn.ok, true);
    if (!signedIn.ok) return;
    assert.equal(signedIn.redirect, "/sup-admin");
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    assert.equal(user.channelFirst, "Paid Google");
    assert.equal((user.mktLast as { g?: string } | null)?.g, "Cj0TESTCLICK");

    await clearPinLimit(email);
    const next = await verifyLoginPin(email, TEST_PIN, undefined, "/sup-admin/activity");
    assert.equal(next.ok, true);
    if (!next.ok) return;
    assert.equal(next.redirect, "/sup-admin/activity");

    const rejected = await verifyLoginPin(email, TEST_PIN, undefined, "https://evil.example/phish");
    assert.equal(rejected.ok, true);
    if (!rejected.ok) return;
    assert.equal(rejected.redirect, "/sup-admin");
  });
});

test("copying an ads cookie onto a user does not pass Payment-only fields", async () => {
  const email = "pin-mkt-user@example.com";
  await prisma.user.deleteMany({ where: { email } });
  const user = await prisma.user.create({ data: { email, compAccess: true, onboardedAt: new Date() } });
  const cookie = encodeMarketing({
    f: { s: "google", m: "cpc", g: "GCLIDTEST", p: "/", at: Math.floor(Date.now() / 1000) },
    l: { s: "google", m: "cpc", g: "GCLIDTEST", p: "/login", at: Math.floor(Date.now() / 1000) },
  });
  await applyMarketingToUser(
    user.id,
    new Request("https://www.theaitimemachine.com/login", { headers: { cookie: `${MT_COOKIE}=${cookie}` } }),
  );
  const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(saved.channelLast, "Paid Google");
  assert.equal((saved.mktFirst as { g?: string } | null)?.g, "GCLIDTEST");
});
