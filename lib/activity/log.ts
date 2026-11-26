import { isInternalEmail } from "@/lib/admin/metrics";
import { sourceFromStored } from "@/lib/marketing/touch";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const EVENT_TYPES = [
  "visit",
  "signup",
  "otp",
  "login",
  "customer.update",
  "checkout",
  "pay_again",
  "inapp_browser_prompt",
  "cashfree.attempt",
  "webhook",
  "payment.paid",
  "payment.failed",
  "payment.refunded",
  "email.sent",
  "email.failed",
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
  "email.suppressed",
  "email.delivery_delayed",
  "recovery_email_sent",
  "recovery_email_manual",
  "recovery_link_clicked",
  "cta_click",
  "form_start",
  "form_step",
  "checkout.return",
  "clarity.session",
  "agent",
  "admin",
  "error",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_LABEL: Record<string, string> = {
  visit: "Visit",
  signup: "Signup",
  otp: "OTP requested",
  login: "Login",
  "customer.update": "Customer updated",
  checkout: "Checkout started",
  pay_again: "Pay again",
  inapp_browser_prompt: "In-app browser prompt",
  "cashfree.attempt": "Cashfree attempt",
  webhook: "Webhook",
  "payment.paid": "Payment paid",
  "payment.failed": "Payment failed",
  "payment.refunded": "Payment refunded",
  "email.sent": "Email sent",
  "email.failed": "Email failed",
  "email.delivered": "Email delivered",
  "email.opened": "Email opened",
  "email.clicked": "Email clicked",
  "email.bounced": "Email bounced",
  "email.complained": "Marked as spam",
  "email.suppressed": "Email suppressed",
  "email.delivery_delayed": "Email delayed",
  recovery_email_sent: "Recovery email sent",
  recovery_email_manual: "Manual recovery email sent from Gmail",
  recovery_link_clicked: "Clicked recovery link",
  cta_click: "CTA click",
  form_start: "Checkout form started",
  form_step: "Checkout form step",
  "checkout.return": "Returned from payment",
  "clarity.session": "Clarity session",
  agent: "Workspace",
  admin: "Admin",
  error: "Error",
};

export type EventInput = {
  type: EventType | string;
  at?: Date;
  source?: string | null;
  email?: string | null;
  phone?: string | null;
  userId?: string | null;
  paymentId?: string | null;
  amountInr?: number | null;
  status?: string | null;
  summary: string;
  detail?: string | null;
  tag?: "admin" | "test" | null;
  isTest?: boolean;
  dedupeKey?: string | null;
};

export function eventTag(input: { email?: string | null; isTest?: boolean; tag?: "admin" | "test" | null }) {
  if (input.tag) return input.tag;
  if (input.isTest) return "test" as const;
  if (isInternalEmail(input.email)) return "admin" as const;
  return null;
}

function clip(value: string | null | undefined, max = 500) {
  const text = (value || "").trim();
  return text ? text.slice(0, max) : null;
}

type EventWriter = Prisma.TransactionClient | typeof prisma;

/** Append-only. Never throws. Same dedupeKey is ignored on retry. */
export async function logEvent(input: EventInput, db: EventWriter = prisma) {
  try {
    const email = clip(input.email?.toLowerCase(), 200);
    const tag = eventTag({ email, isTest: input.isTest, tag: input.tag });
    await db.systemEvent.create({
      data: {
        createdAt: input.at,
        type: input.type.slice(0, 40),
        source: clip(input.source, 80),
        email,
        phone: clip(input.phone, 32),
        userId: clip(input.userId, 40),
        paymentId: clip(input.paymentId, 64),
        amountInr: input.amountInr ?? null,
        status: clip(input.status, 80),
        summary: input.summary.slice(0, 500),
        detail: clip(input.detail, 1000),
        tag,
        dedupeKey: clip(input.dedupeKey, 180),
      },
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "P2002") return;
    console.error("system event log failed", error);
  }
}

export function paymentSource(payment: { mktLast?: unknown; mktFirst?: unknown; channelLast?: string | null; channelFirst?: string | null; affiliateId?: string | null }) {
  return sourceFromStored(payment.mktLast || payment.mktFirst, payment.channelLast || payment.channelFirst, { affiliate: Boolean(payment.affiliateId) });
}
