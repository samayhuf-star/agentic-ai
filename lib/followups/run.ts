import { createHmac, timingSafeEqual } from "node:crypto";
import { appOrigin, authSecret, formatInr } from "@/lib/config";
import { BUSINESS } from "@/lib/business";
import { sendEmail } from "@/lib/messaging/email";
import { prisma } from "@/lib/prisma";

const HOUR = 60 * 60 * 1000;

const CHECKOUT_STEPS = [
  { step: "checkout_1h", after: HOUR },
  { step: "checkout_24h", after: 24 * HOUR },
  { step: "checkout_72h", after: 72 * HOUR },
] as const;

const ONBOARD_STEPS = [
  { step: "onboard_2h", after: 2 * HOUR },
  { step: "onboard_24h", after: 24 * HOUR },
] as const;

export function unsubscribeToken(id: string) {
  return createHmac("sha256", authSecret() || "dev-auth-secret").update(`unsub:${id}`).digest("hex");
}

export function unsubscribeLink(id: string) {
  const token = unsubscribeToken(id);
  return `${appOrigin()}/unsubscribe?id=${encodeURIComponent(id)}&token=${token}`;
}

export function tokenMatches(id: string, token: string) {
  const expected = unsubscribeToken(id);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function footer(id: string) {
  return ["", "Rizwiz Enterprises", BUSINESS.supportEmail, `Stop these notes: ${unsubscribeLink(id)}`].join("\n");
}

function checkoutLetter(amountInr: number, id: string) {
  return {
    subject: "Your AI Time Machine checkout is still open",
    text: [
      "Hello,",
      "",
      `You started checkout and the payment is not finished. The price is ${formatInr(amountInr)} once.`,
      "",
      `Continue here: ${appOrigin()}/api/checkout`,
      "",
      "If you already paid, you can ignore this note.",
      footer(id),
    ].join("\n"),
  };
}

function onboardLetter(id: string) {
  return {
    subject: "Sign in to AI Time Machine",
    text: [
      "Hello,",
      "",
      "Your payment is in. Sign in with this email to open your account.",
      "",
      `${appOrigin()}/login`,
      footer(id),
    ].join("\n"),
  };
}

async function claim(key: string, step: string, toEmail: string, leadId?: string) {
  try {
    await prisma.followupSend.create({ data: { key, step, toEmail, leadId } });
    return true;
  } catch {
    return false;
  }
}

export async function runFollowups(now = new Date()) {
  let sent = 0;
  const pending = await prisma.lead.findMany({
    where: { status: "pending", marketingOptOut: false, email: { not: null } },
    take: 200,
  });
  for (const lead of pending) {
    if (!lead.email) continue;
    const sentSteps = new Set((await prisma.followupSend.findMany({ where: { leadId: lead.id }, select: { step: true } })).map((row) => row.step));
    const age = now.getTime() - lead.createdAt.getTime();
    const due = CHECKOUT_STEPS.find((step) => age >= step.after && !sentSteps.has(step.step));
    if (!due) continue;
    const key = `lead:${lead.id}:${due.step}`;
    if (!(await claim(key, due.step, lead.email, lead.id))) continue;
    const letter = checkoutLetter(lead.amountInr, lead.id);
    try {
      await sendEmail(lead.email, letter.subject, letter.text);
      sent += 1;
    } catch (error) {
      await prisma.followupSend.delete({ where: { key } }).catch(() => undefined);
      console.error("followup", error);
    }
  }

  const users = await prisma.user.findMany({
    where: { email: { not: null }, onboardedAt: null, marketingOptOut: false, compAccess: false, payments: { some: { status: "paid" } } },
    include: { payments: { where: { status: "paid" }, orderBy: { paidAt: "asc" }, take: 1 } },
    take: 200,
  });
  for (const user of users) {
    if (!user.email) continue;
    const sentSteps = new Set(
      (await prisma.followupSend.findMany({ where: { key: { startsWith: `user:${user.id}:` } }, select: { step: true } })).map((row) => row.step),
    );
    const paidAt = user.payments[0]?.paidAt || user.payments[0]?.createdAt || user.createdAt;
    const age = now.getTime() - paidAt.getTime();
    const due = ONBOARD_STEPS.find((step) => age >= step.after && !sentSteps.has(step.step));
    if (!due) continue;
    const key = `user:${user.id}:${due.step}`;
    if (!(await claim(key, due.step, user.email))) continue;
    const letter = onboardLetter(user.id);
    try {
      await sendEmail(user.email, letter.subject, letter.text);
      sent += 1;
    } catch (error) {
      await prisma.followupSend.delete({ where: { key } }).catch(() => undefined);
      console.error("followup", error);
    }
  }
  return { sent };
}
