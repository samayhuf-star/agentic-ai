import bcrypt from "bcryptjs";
import { completeLogin, isEmail } from "@/lib/auth";
import { eventTag, logEvent } from "@/lib/activity/log";
import { prisma } from "@/lib/prisma";
import { clientIp, hitLimit, isLimited } from "@/lib/rate-limit";

const PIN_ATTEMPTS = 5;
const PIN_LOCK_MS = 15 * 60 * 1000;

function cleanEmail(email: string) {
  return email.trim().toLowerCase();
}

function pinEmailFromEnv() {
  return (process.env.LOGIN_PIN_EMAIL || "samayhuf@gmail.com").trim().toLowerCase();
}

function lockKey(email: string) {
  return `pin:email:${email}`;
}

export async function pinHashFor(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { pinHash: true } });
  if (user?.pinHash) return user.pinHash;
  const envHash = (process.env.LOGIN_PIN_HASH || "").trim();
  if (envHash && email === pinEmailFromEnv()) return envHash;
  return null;
}

export async function loginOptions(emailInput: string) {
  const email = cleanEmail(emailInput || "");
  if (!isEmail(email)) return { ok: false as const, status: 400, message: "Enter a valid email.", pin: false };
  const hash = await pinHashFor(email);
  return { ok: true as const, status: 200, pin: Boolean(hash) };
}

async function logPinAttempt(email: string, status: "failed" | "locked") {
  await logEvent({
    type: "login",
    email,
    status,
    summary: status === "locked" ? `PIN sign-in locked for ${email}` : `PIN sign-in failed for ${email}`,
    tag: eventTag({ email }),
  });
}

export async function verifyLoginPin(emailInput: string, pinInput: string, request?: Request) {
  const email = cleanEmail(emailInput || "");
  const pin = (pinInput || "").replace(/\D/g, "");
  if (!isEmail(email) || pin.length !== 6) {
    return { ok: false as const, status: 400, message: "Enter your 6-digit PIN." };
  }
  const hash = await pinHashFor(email);
  if (!hash) {
    return { ok: false as const, status: 400, message: "Use the email code to sign in." };
  }
  const key = lockKey(email);
  const limited = await isLimited(key, PIN_ATTEMPTS);
  if (limited.locked) {
    await logPinAttempt(email, "locked");
    return { ok: false as const, status: 429, message: "Too many tries. Wait 15 minutes and try again." };
  }
  const match = await bcrypt.compare(pin, hash);
  if (!match) {
    const limit = await hitLimit(key, PIN_ATTEMPTS, PIN_LOCK_MS);
    if (!limit.ok) {
      await logPinAttempt(email, "locked");
      return { ok: false as const, status: 429, message: "Too many tries. Wait 15 minutes and try again." };
    }
    await logPinAttempt(email, "failed");
    return { ok: false as const, status: 400, message: "That PIN is not right." };
  }
  await prisma.rateLimit.deleteMany({ where: { id: key } });
  return completeLogin(email, request, "pin");
}
