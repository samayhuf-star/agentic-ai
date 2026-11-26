import { appOrigin, formatInr } from "@/lib/config";
import { BUSINESS } from "@/lib/business";
import { unsubscribeLink } from "@/lib/followups/run";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/activity/log";

/**
 * Payment recovery emails for failed or dropped checkouts.
 * r1 goes out immediately when a payment fails or is dropped, then +10 min, +2 h, +24 h and +3 days (final),
 * measured from r1. Stops as soon as the buyer pays or opts out. One sequence per email address.
 * Customer sends need RECOVERY_EMAILS=on. Test sends (force) go only to the address given.
 */
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const RECOVERY_STEPS = [
  { step: "r1", after: 0 },
  { step: "r2", after: 10 * MINUTE },
  { step: "r3", after: 2 * HOUR },
  { step: "r4", after: 24 * HOUR },
  { step: "r5", after: 72 * HOUR },
] as const;
type Step = (typeof RECOVERY_STEPS)[number]["step"];

/** A Cashfree order expires 30 minutes after it is created; past that, an unpaid order counts as dropped. */
const DROPPED_AFTER = 31 * MINUTE;

export function recoveryEnabled() {
  return process.env.RECOVERY_EMAILS === "on";
}

/** Only orders created after this get recovery emails. Earlier buyers were never told to expect them. */
export function recoveryCutoff() {
  const at = Date.parse(process.env.RECOVERY_CUTOFF || "2026-11-26T07:40:00Z");
  return new Date(Number.isFinite(at) ? at : Date.now());
}

const PAID = ["paid", "paid_unassigned"];

async function blocked(email: string) {
  const [paid, leadOut, userOut] = await Promise.all([
    prisma.payment.count({ where: { email, status: { in: PAID } } }),
    prisma.lead.count({ where: { email, marketingOptOut: true } }),
    prisma.user.count({ where: { email, marketingOptOut: true } }),
  ]);
  return paid + leadOut + userOut > 0;
}

async function claim(key: string, step: string, toEmail: string, leadId?: string | null) {
  try {
    await prisma.followupSend.create({ data: { key, step, toEmail, leadId: leadId || undefined } });
    return true;
  } catch {
    return false;
  }
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const COPY: Record<Step, { subject: (amt: string) => string; lead: (amt: string) => string }> = {
  r1: {
    subject: (amt) => `Your ${amt} payment did not go through. Finish it in one tap`,
    lead: (amt) => `Your payment of ${amt} for AI Time Machine did not finish, and no money was taken. Your order is saved, so you can pay in one tap.`,
  },
  r2: {
    subject: () => "Your AI Time Machine order is still saved",
    lead: (amt) => `Your order is still waiting. Pay ${amt} once and your 55 AI agents open right away.`,
  },
  r3: {
    subject: () => "Still want AI Time Machine? Your order is waiting",
    lead: (amt) => `You were one step away. Your order for ${amt} is saved with your details.`,
  },
  r4: {
    subject: () => "Reminder: finish your AI Time Machine order",
    lead: (amt) => `Your AI Time Machine order from yesterday is still saved. It is ${amt} once, with no monthly fee.`,
  },
  r5: {
    subject: () => "Last reminder: your AI Time Machine order",
    lead: (amt) => `This is our last note about your saved order for ${amt}. After this we will not remind you again.`,
  },
};

export function recoveryLetter(input: { orderId: string; amountInr: number; name?: string | null; step: Step; unsubscribeUrl: string }) {
  const origin = appOrigin();
  const amt = formatInr(input.amountInr);
  const pay = `${origin}/api/checkout/retry?order=${encodeURIComponent(input.orderId)}`;
  const qr = `${origin}/api/checkout/qr?order=${encodeURIComponent(input.orderId)}`;
  const first = (input.name || "").trim().split(/\s+/)[0];
  const hello = first ? `Hi ${first},` : "Hello,";
  const copy = COPY[input.step];
  const subject = copy.subject(amt);
  const rizwiz = "The payment page will show Rizwiz Enterprises, the company behind AI Time Machine.";
  const text = [
    hello,
    "",
    copy.lead(amt),
    "",
    `Complete payment (${amt}): ${pay}`,
    "",
    "Ways to pay on that page: any UPI app (Google Pay, PhonePe, Paytm), UPI ID or QR, debit or credit card, net banking, or wallet.",
    "Reading this on a computer? Scan the QR code in this email with your phone camera to pay on your phone.",
    "If Google Pay or PhonePe does not open, open the link in Chrome or Safari, or choose “Pay by UPI ID / QR”.",
    "",
    rizwiz,
    "If you already paid, you can ignore this note.",
    "",
    `Rizwiz Enterprises · ${BUSINESS.supportEmail}`,
    `Stop these emails: ${input.unsubscribeUrl}`,
  ].join("\n");
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e1d1c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee"><tr><td align="center" style="padding:20px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px">
<tr><td style="padding:24px 24px 8px;font-size:15px;font-weight:700">AI Time Machine</td></tr>
<tr><td style="padding:8px 24px 0;font-size:16px;line-height:1.5">${esc(hello)}</td></tr>
<tr><td style="padding:8px 24px 0;font-size:16px;line-height:1.5">${esc(copy.lead(amt))}</td></tr>
<tr><td style="padding:16px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;border-radius:10px"><tr>
<td style="padding:12px 14px;font-size:14px;color:#78756f">Order total</td><td align="right" style="padding:12px 14px;font-size:20px;font-weight:700">${esc(amt)}</td></tr>
<tr><td colspan="2" style="padding:0 14px 12px;font-size:12px;color:#78756f">One payment · No monthly fee · Order ${esc(input.orderId)}</td></tr></table></td></tr>
<tr><td align="center" style="padding:20px 24px 4px"><a href="${pay}" style="display:block;background:#1e1d1c;color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:15px 20px;border-radius:999px">Complete payment · ${esc(amt)}</a></td></tr>
<tr><td align="center" style="padding:4px 24px 0;font-size:12px;color:#78756f">Opens the secure Cashfree page with your details filled in</td></tr>
<tr><td style="padding:20px 24px 0;font-size:15px;font-weight:700">Ways to pay</td></tr>
<tr><td style="padding:6px 24px 0;font-size:14px;line-height:1.7">
• Any UPI app: Google Pay, PhonePe, Paytm, CRED<br>
• UPI ID or UPI QR: choose “Pay by UPI ID / QR” on the page<br>
• Debit or credit card<br>
• Net banking or wallet</td></tr>
<tr><td align="center" style="padding:20px 24px 0"><img src="${qr}" width="180" height="180" alt="QR code to pay on your phone" style="display:block;width:180px;height:180px;border:0"></td></tr>
<tr><td align="center" style="padding:6px 24px 0;font-size:13px;color:#78756f">On a computer? Scan with your phone camera to pay on your phone.</td></tr>
<tr><td style="padding:20px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e6;border:1px solid #f0d58a;border-radius:10px"><tr><td style="padding:12px 14px;font-size:14px;line-height:1.5"><b>Heads up:</b> ${esc(rizwiz)} Our company name is Rizwiz Enterprises.</td></tr></table></td></tr>
<tr><td style="padding:14px 24px 0;font-size:13px;line-height:1.5;color:#78756f">If Google Pay or PhonePe does not open, open the link in Chrome or Safari, or pay by UPI ID, QR, card or net banking. If you already paid, ignore this email.</td></tr>
<tr><td style="padding:20px 24px 24px;font-size:12px;line-height:1.6;color:#9a968f">Rizwiz Enterprises · <a href="mailto:${BUSINESS.supportEmail}" style="color:#9a968f">${BUSINESS.supportEmail}</a><br><a href="${input.unsubscribeUrl}" style="color:#9a968f">Stop these emails</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

async function deliver(to: string, letter: { subject: string; text: string; html: string }) {
  const from = process.env.RECOVERY_FROM || process.env.RESEND_FROM || "AI Time Machine <no-reply@adiology.io>";
  let id: string | null = null;
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject: letter.subject, text: letter.text, html: letter.html, reply_to: BUSINESS.supportEmail }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) throw new Error(`Resend ${response.status}: ${body.message || "send failed"}`);
    id = body.id || null;
  }
  await prisma.emailLog
    .create({ data: { toEmail: to, subject: letter.subject, body: letter.text, provider: process.env.RESEND_API_KEY ? "resend" : "mock" } })
    .catch(() => undefined);
  return id;
}

async function sendStep(paymentId: string, step: Step, opts: { to?: string; keyPrefix?: string } = {}) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment?.email) return null;
  const to = (opts.to || payment.email).toLowerCase();
  const lead = await prisma.lead.findUnique({ where: { orderId: payment.id }, select: { id: true } });
  const key = `${opts.keyPrefix || "recovery"}:${to}:${step}`;
  if (!(await claim(key, step, to, lead?.id))) return null;
  const letter = recoveryLetter({
    orderId: payment.id,
    amountInr: payment.amountInr,
    name: payment.name,
    step,
    unsubscribeUrl: lead ? unsubscribeLink(lead.id) : `${appOrigin()}/contact`,
  });
  try {
    const id = await deliver(to, letter);
    console.log(`recovery ${step} sent to ${to.replace(/^(.).*@/, "$1***@")} order ${payment.id} resend ${id || "mock"}`);
    await logEvent({
      type: "recovery_email_sent",
      email: to,
      paymentId: payment.id,
      amountInr: payment.amountInr,
      status: step,
      summary: `Recovery ${step} to ${to}: ${letter.subject}`,
      detail: `order ${payment.id}`,
      isTest: payment.isTest || Boolean(opts.keyPrefix),
      tag: opts.keyPrefix ? "test" : undefined,
      dedupeKey: `recovery_email_sent:${key}`,
    });
    return id || "mock";
  } catch (error) {
    await prisma.followupSend.delete({ where: { key } }).catch(() => undefined);
    console.error("recovery", error);
    await logEvent({
      type: "email.failed",
      email: to,
      paymentId: payment.id,
      amountInr: payment.amountInr,
      status: step,
      summary: `Recovery ${step} to ${to} failed`,
      detail: error instanceof Error ? error.message : "send failed",
      dedupeKey: `email.failed:recovery:${key}:${Date.now()}`,
    });
    return null;
  }
}

/** Email #1, right away, when a payment fails or the buyer comes back without paying. */
export async function triggerRecovery(orderId: string) {
  if (!recoveryEnabled()) return null;
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment?.email || payment.isTest || PAID.includes(payment.status)) return null;
  if (payment.createdAt < recoveryCutoff()) return null;
  const email = payment.email.toLowerCase();
  if (await blocked(email)) return null;
  return sendStep(orderId, "r1");
}

/** Worker tick: start sequences for dropped orders, then send the next due follow-up. */
export async function runRecovery(now = new Date()) {
  if (!recoveryEnabled()) return { sent: 0 };
  let sent = 0;
  const cutoff = recoveryCutoff();
  const dropped = await prisma.payment.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      isTest: false,
      email: { not: null },
      createdAt: { gte: cutoff, lte: new Date(now.getTime() - DROPPED_AFTER) },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const seen = new Set<string>();
  for (const p of dropped) {
    const email = p.email!.toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    const started = await prisma.followupSend.count({ where: { key: `recovery:${email}:r1` } });
    if (!started && (await triggerRecovery(p.id))) sent += 1;
  }

  const starts = await prisma.followupSend.findMany({
    where: { step: "r1", key: { startsWith: "recovery:" }, createdAt: { gte: new Date(now.getTime() - 4 * 24 * HOUR) } },
    take: 500,
  });
  for (const start of starts) {
    const email = start.toEmail.toLowerCase();
    if (await blocked(email)) continue;
    const done = new Set(
      (await prisma.followupSend.findMany({ where: { key: { startsWith: `recovery:${email}:` } }, select: { step: true } })).map((r) => r.step),
    );
    const age = now.getTime() - start.createdAt.getTime();
    // Latest step that is due; if the worker was down, skip older ones rather than sending a burst.
    const due = [...RECOVERY_STEPS].reverse().find((s) => s.after > 0 && age >= s.after);
    if (!due || done.has(due.step)) continue;
    const latest = await prisma.payment.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, status: { notIn: PAID } },
      orderBy: { createdAt: "desc" },
    });
    if (!latest) continue;
    if (await sendStep(latest.id, due.step)) sent += 1;
  }
  return { sent };
}

/** One-off test send to an approved address (ignores the customer flag). Deduped per order + address + step. */
export async function sendRecoveryTest(orderId: string, to: string, steps: Step[] = ["r1"]) {
  const ids: Record<string, string | null> = {};
  for (const step of steps) ids[step] = await sendStep(orderId, step, { to, keyPrefix: `recovery-test-${orderId}` });
  return ids;
}
