import { prisma } from "@/lib/prisma";
import { applyMarketingToUser } from "@/lib/marketing/server";
import { isAdminEmail, isProduction, isStaffEmail } from "@/lib/config";
import { hashSecret, randomToken, sixDigitCode } from "@/lib/crypto";
import { CODE_TTL_COPY, CODE_TTL_MS, codeFromEmailBody } from "@/lib/login-code";
import { SIGN_IN_CODE_SUBJECTS } from "@/lib/payments/sign-in-code";
import { sendEmail } from "@/lib/messaging/email";
import { clientIp, hitLimit } from "@/lib/rate-limit";
import { welcomeEmail } from "@/lib/copy";
import { queueOwnerAlert } from "@/lib/alerts/notify";
import { attachLeadContact } from "@/lib/leads";
import { eventTag, logEvent } from "@/lib/activity/log";

const TEN_MINUTES = 10 * 60 * 1000;
const SESSION_DAYS = 30;
export const SESSION_COOKIE = "ai_time_machine_session";

export function cookieDomain(host: string | null | undefined) {
  const hostname = (host || "").split(":")[0].toLowerCase().replace(/\.$/, "");
  if (hostname === "theaitimemachine.com" || hostname === "www.theaitimemachine.com") return ".theaitimemachine.com";
  return undefined;
}

export function sessionCookieOptions(request?: Request) {
  const host = request?.headers.get("x-forwarded-host") || request?.headers.get("host");
  const domain = cookieDomain(host);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
    ...(domain ? { domain } : {}),
  };
}

function cleanEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function issueCode(email: string, request: Request) {
  const ip = clientIp(request);
  const emailLimit = await hitLimit(`otp:email:${email}`, 5, TEN_MINUTES);
  const ipLimit = await hitLimit(`otp:ip:${ip}`, 10, TEN_MINUTES);
  if (!emailLimit.ok || !ipLimit.ok) {
    return { ok: false as const, status: 429, message: "Too many codes were asked for. Wait a few minutes and try again." };
  }
  const existing = await prisma.loginCode.findFirst({
    where: { email, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const prior = await prisma.emailLog.findFirst({
    where: { toEmail: email, subject: { in: SIGN_IN_CODE_SUBJECTS } },
    orderBy: { createdAt: "desc" },
  });
  const priorCode = prior ? codeFromEmailBody(prior.body) : null;
  const reusable = Boolean(existing && priorCode && existing.codeHash === hashSecret(priorCode));
  const code = reusable && priorCode ? priorCode : sixDigitCode();
  let codeRow = existing;
  if (!reusable) {
    await prisma.loginCode.deleteMany({ where: { email } });
    codeRow = await prisma.loginCode.create({
      data: { email, codeHash: hashSecret(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });
  }
  const subject = "Your AI Time Machine code";
  const text = `Your AI Time Machine code is ${code}. It expires in ${CODE_TTL_COPY}. If you did not ask for it, ignore this email.`;
  try {
    await sendEmail(email, subject, text);
  } catch {
    return { ok: false as const, status: 502, message: "The code could not be emailed. Wait a minute and try again." };
  }
  await logEvent({
    type: "otp",
    email,
    status: "requested",
    summary: `Sign-in code emailed to ${email}`,
    tag: eventTag({ email }),
    dedupeKey: `otp:${codeRow!.id}`,
  });
  const emailIsMock = !process.env.RESEND_API_KEY;
  const showCode = emailIsMock || !isProduction();
  return {
    ok: true as const,
    status: 200,
    message: showCode ? "Email is in test mode. Use the code shown here." : "Code sent. Check your inbox.",
    devCode: showCode ? code : undefined,
  };
}

type AccessUser = { compAccess: boolean; payments: unknown[]; suspendedAt?: Date | null } | null;

function hasProductAccess(user: AccessUser) {
  if (!user || user.suspendedAt) return false;
  return Boolean(user.compAccess || user.payments.length > 0);
}

async function upsertCompUser(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.compAccess || !existing.onboardedAt) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { compAccess: true, onboardedAt: existing.onboardedAt ?? new Date() },
      });
      await logEvent({
        type: "customer.update",
        email,
        userId: existing.id,
        status: "comp",
        summary: `Updated ${email} (comp access)`,
        tag: eventTag({ email }),
        dedupeKey: `customer.update:comp:${existing.id}`,
      });
    }
  } else {
    const created = await prisma.user.create({ data: { email, compAccess: true, onboardedAt: new Date() } });
    await logEvent({
      type: "signup",
      email,
      userId: created.id,
      summary: `Account created for ${email}`,
      tag: eventTag({ email }),
      dedupeKey: `signup:${created.id}`,
    });
  }
  return prisma.user.findUniqueOrThrow({
    where: { email },
    include: { payments: { where: { status: "paid" }, take: 1 } },
  });
}

export async function requestLoginCode(emailInput: string, request: Request) {
  const email = cleanEmail(emailInput || "");
  if (!isEmail(email)) return { ok: false as const, status: 400, message: "Enter a valid email." };
  const user = await prisma.user.findUnique({ where: { email }, include: { payments: { where: { status: "paid" }, take: 1 } } });
  if (!isAdminEmail(email) && !isStaffEmail(email) && !hasProductAccess(user)) {
    return {
      ok: false as const,
      status: 403,
      message: "No paid AI Time Machine account uses that email yet. Pay first, then use the code we email you.",
    };
  }
  return issueCode(email, request);
}

export async function startWelcome(token: string, emailInput: string, request: Request) {
  const email = cleanEmail(emailInput || "");
  if (!token || !isEmail(email)) return { ok: false as const, status: 400, message: "Enter the email you want to use." };
  const user = await prisma.user.findUnique({ where: { emailTokenHash: hashSecret(token) } });
  if (!user || !user.emailTokenExpires || user.emailTokenExpires < new Date()) {
    return { ok: false as const, status: 400, message: "This link has expired. Write to support@theaitimemachine.com and we will send another." };
  }
  if (user.email && user.email !== email) {
    return { ok: false as const, status: 400, message: "This payment already has an email. Sign in with that email." };
  }
  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken && taken.id !== user.id) {
    return { ok: false as const, status: 409, message: "That email is already used by another AI Time Machine account." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { pendingEmail: email } });
  const issued = await issueCode(email, request);
  if (!issued.ok) return issued;
  return { ...issued, message: issued.devCode ? "Email is in test mode. Use the code shown here." : "Code sent. Check your inbox." };
}

export async function verifyLoginCode(emailInput: string, codeInput: string, request?: Request, next?: string) {
  const email = cleanEmail(emailInput || "");
  const code = (codeInput || "").replace(/\D/g, "");
  if (!isEmail(email) || code.length !== 6) {
    return { ok: false as const, status: 400, message: "Enter the 6-digit code from your email." };
  }
  const row = await prisma.loginCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  const otpOk = Boolean(row && row.expiresAt >= new Date() && row.attempts < 5 && row.codeHash === hashSecret(code));
  if (otpOk && row) {
    await prisma.loginCode.delete({ where: { id: row.id } });
    return completeLogin(email, request, "otp", next);
  }

  // Accounts with a PIN may enter it on any code screen (including /payment/success).
  const { pinHashFor, verifyLoginPin } = await import("@/lib/auth-pin");
  if (await pinHashFor(email)) {
    const pin = await verifyLoginPin(email, code, request, next);
    if (pin.ok || pin.status === 429) return pin;
  }

  if (!row || row.expiresAt < new Date()) {
    return { ok: false as const, status: 400, message: "That code has expired. Ask for a new one." };
  }
  if (row.attempts >= 5) {
    return { ok: false as const, status: 429, message: "Too many tries. Ask for a new code." };
  }
  await prisma.loginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
  return { ok: false as const, status: 400, message: "That code is not right." };
}

export function safeRedirectPath(raw: unknown, fallback: string) {
  const path = String(raw || "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://") || path.includes("\\")) return fallback;
  if (/[\s<>]/.test(path)) return fallback;
  return path;
}

export async function completeLogin(email: string, request?: Request, via?: "otp" | "pin", next?: string) {
  let user = await prisma.user.findFirst({
    where: { OR: [{ email }, { pendingEmail: email }] },
    include: { payments: { where: { status: "paid" }, take: 1 } },
  });
  const admin = isAdminEmail(email);
  const staff = !admin && isStaffEmail(email);
  if (user && !user.email && user.pendingEmail === email) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { email, pendingEmail: null, emailTokenHash: null, emailTokenExpires: null },
      include: { payments: { where: { status: "paid" }, take: 1 } },
    });
    await logEvent({
      type: "customer.update",
      email,
      phone: user.phone,
      userId: user.id,
      status: "email_attached",
      summary: `Attached email ${email}`,
      dedupeKey: `customer.update:email:${user.id}`,
    });
    if (!user.welcomeEmailSentAt) {
      const note = welcomeEmail(user);
      await sendEmail(email, note.subject, note.text);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { welcomeEmailSentAt: new Date() },
        include: { payments: { where: { status: "paid" }, take: 1 } },
      });
    }
  }
  if (admin || staff) user = await upsertCompUser(email);
  if (!hasProductAccess(user ? { compAccess: user.compAccess, payments: user.payments, suspendedAt: user.suspendedAt } : null)) {
    return { ok: false as const, status: 403, message: "Only a paid AI Time Machine account can sign in." };
  }

  if (user?.id) {
    const prior = await prisma.session.count({ where: { userId: user.id } });
    if (prior === 0) {
      queueOwnerAlert({
        kind: "first_login",
        dedupeKey: `first_login:${user.id}`,
        name: user.businessName,
        email: user.email || email,
        phone: user.phone,
        orderId: null,
        status: "first login",
      });
    }
    await attachLeadContact({ userId: user.id, phone: user.phone, email: user.email || email, name: user.businessName });
    if (request) {
      try {
        await applyMarketingToUser(user.id, request);
      } catch (error) {
        console.error("login marketing", error);
      }
    }
  }

  const token = randomToken();
  const sessionRow = await prisma.session.create({
    data: {
      tokenHash: hashSecret(token),
      email,
      userId: user?.id,
      isAdmin: admin,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  await logEvent({
    type: "login",
    email,
    userId: user?.id,
    status: admin ? "admin" : "ok",
    summary: `${email} signed in`,
    detail: via === "pin" ? "pin" : null,
    tag: eventTag({ email }),
    dedupeKey: `login:${sessionRow.id}`,
  });
  const fallback = (via === "pin" && (admin || staff)) || staff ? "/sup-admin" : admin || user?.compAccess || user?.onboardedAt ? "/dashboard" : "/onboarding";
  const redirect = safeRedirectPath(next, fallback);
  return { ok: true as const, status: 200, token, redirect, isAdmin: admin };
}

export async function getSessionFromToken(token: string | null | undefined) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSecret(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user?.suspendedAt && !isAdminEmail(session.email) && !isStaffEmail(session.email)) return null;
  return session;
}

export function tokenFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)ai_time_machine_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getSessionFromRequest(request: Request) {
  return getSessionFromToken(tokenFromRequest(request));
}

export async function destroySession(token: string | null | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashSecret(token) } });
}
