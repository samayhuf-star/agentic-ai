import { EVENT_LABEL, logEvent, paymentSource } from "@/lib/activity/log";
import { formatIst } from "@/lib/config";
import { clarityPlayerUrl, readClaritySessionId } from "@/lib/marketing/clarity";
import { fetchCashfreeAttempts, fetchCashfreeOrder, type CashfreeAttempt } from "@/lib/payments/cashfree-order";
import { prisma } from "@/lib/prisma";

export type JourneyEvent = {
  at: Date;
  type: string;
  title: string;
  detail?: string | null;
  status?: string | null;
  source?: "db" | "cashfree" | "attribution" | "email";
};

export type PaymentJourney = {
  events: JourneyEvent[];
  stopPoint: string;
  cashfreeStatus: string | null;
  claritySessionId: string | null;
  clarityUrl: string | null;
};

function touchBits(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof row.r === "string" && row.r) parts.push(`referrer ${row.r}`);
  if (typeof row.p === "string" && row.p) parts.push(`landed ${row.p}`);
  if (typeof row.g === "string" && row.g) parts.push("Google click id on file");
  if (typeof row.c === "string" && row.c) parts.push(`campaign ${row.c}`);
  if (typeof row.s === "string" && row.s) parts.push(`utm_source ${row.s}`);
  if (typeof row.m === "string" && row.m) parts.push(`utm_medium ${row.m}`);
  return parts.length ? parts.join(" · ") : null;
}

function junkHint(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const referrer = String((value as { r?: unknown }).r || "").toLowerCase();
  if (!referrer) return null;
  if (/(rathornews|earn\.rathor|news-partner|displayed?news|guryo|udn.com|talkingpointsmemo)/i.test(referrer)) {
    return `Possible Google Search Partner / display junk placement (${referrer})`;
  }
  return null;
}

export function stopPointFrom(input: {
  status: string;
  gateway: string;
  attempts: Array<{ status: string; method?: string | null; error?: string | null; message?: string | null }>;
  cashfreeStatus?: string | null;
}): string {
  if (input.status === "paid" || input.status === "paid_unassigned") return "Paid. Journey complete.";
  if (input.status === "refunded") return "Paid, then refunded.";
  const attempts = input.attempts.filter((row) => row.status && row.status !== "NOT_ATTEMPTED");
  const failed = [...attempts].reverse().find((row) => row.status === "FAILED");
  if (failed) {
    const why = failed.error || failed.message || "no reason given";
    return `Payment failed${failed.method ? ` on ${failed.method}` : ""}: ${why}.`;
  }
  const dropped = [...attempts].reverse().find((row) => row.status === "USER_DROPPED");
  if (dropped) {
    const why = dropped.error || dropped.message || "left before completing authentication";
    return `Opened ${dropped.method || "the payment page"} but dropped off: ${why}.`;
  }
  if (input.gateway === "razorpay" && (input.status === "pending" || input.status === "failed")) {
    return "Cashfree did not create an order, so they were sent to the Razorpay backup page. Payment is not confirmed.";
  }
  const expired = /EXPIRED/i.test(input.cashfreeStatus || "") || input.status === "failed";
  if (expired && attempts.length === 0) {
    return "Reached checkout and opened the payment page, but no payment method was started before the order expired.";
  }
  if (input.cashfreeStatus === "ACTIVE" && attempts.length === 0) {
    return "Checkout started and the Cashfree order is still open. No payment method has been started yet.";
  }
  if (input.cashfreeStatus === "ACTIVE") {
    return "Cashfree order is still open. Last attempt did not complete.";
  }
  if (input.status === "pending") return "Checkout started. Payment was not completed.";
  return `Stopped at ${input.status}.`;
}

function attemptTitle(row: CashfreeAttempt) {
  const method = row.method ? ` via ${row.method}` : "";
  if (row.status === "USER_DROPPED") return `Gateway opened${method}: user dropped off`;
  if (row.status === "FAILED") return `Payment failed${method}`;
  if (row.status === "SUCCESS") return `Payment succeeded${method}`;
  if (row.status === "NOT_ATTEMPTED") return `Payment method listed${method} (not attempted)`;
  return `Cashfree ${row.status}${method}`;
}

export async function loadPaymentJourney(paymentId: string): Promise<PaymentJourney | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;

  const email = payment.email || undefined;
  const [events, emails, followups, audit, lead] = await Promise.all([
    prisma.systemEvent.findMany({
      where: {
        OR: [
          { paymentId },
          ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
          ...(payment.userId ? [{ userId: payment.userId }] : []),
          ...(payment.phone ? [{ phone: payment.phone }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 400,
    }),
    email
      ? prisma.emailLog.findMany({ where: { toEmail: { equals: email, mode: "insensitive" } }, orderBy: { createdAt: "asc" }, take: 100 })
      : Promise.resolve([]),
    email
      ? prisma.followupSend.findMany({ where: { toEmail: { equals: email, mode: "insensitive" } }, orderBy: { createdAt: "asc" }, take: 100 })
      : Promise.resolve([]),
    prisma.adminAudit.findMany({ where: { entity: "payment", entityId: paymentId }, orderBy: { createdAt: "asc" }, take: 50 }),
    prisma.lead.findUnique({ where: { orderId: paymentId } }),
  ]);

  const out: JourneyEvent[] = [];
  const firstDetail = touchBits(payment.mktFirst);
  const lastDetail = touchBits(payment.mktLast);
  const junk = junkHint(payment.mktFirst) || junkHint(payment.mktLast);
  if (firstDetail || payment.channelFirst) {
    out.push({
      at: payment.createdAt,
      type: "visit",
      title: `Arrived from ${payment.channelFirst || paymentSource(payment) || "unknown"}`,
      detail: [firstDetail, junk].filter(Boolean).join(" · ") || null,
      source: "attribution",
    });
  }
  if (lastDetail && lastDetail !== firstDetail) {
    out.push({
      at: payment.createdAt,
      type: "visit",
      title: `Last touch: ${payment.channelLast || "unknown"}`,
      detail: lastDetail,
      source: "attribution",
    });
  }

  for (const row of events) {
    // Skip anonymous visits that we cannot tie to this buyer (no payment/email/user).
    if (row.type === "visit" && !row.paymentId && !row.email && !row.userId) continue;
    out.push({
      at: row.createdAt,
      type: row.type,
      title: EVENT_LABEL[row.type] || row.summary,
      detail: [row.summary !== (EVENT_LABEL[row.type] || "") ? (EVENT_LABEL[row.type] ? row.summary : null) : null, row.detail].filter(Boolean).join(" · ") || row.summary,
      status: row.status,
      source: "db",
    });
  }

  for (const row of emails) {
    out.push({
      at: row.createdAt,
      type: "email.sent",
      title: `Email sent: ${row.subject}`,
      detail: `via ${row.provider}`,
      source: "email",
    });
  }
  for (const row of followups) {
    const kind = row.step.startsWith("r") ? `Automated recovery ${row.step}` : `Follow-up ${row.step}`;
    out.push({
      at: row.createdAt,
      type: "recovery_email_sent",
      title: kind,
      detail: row.key,
      status: row.step,
      source: "email",
    });
  }
  for (const row of audit) {
    out.push({
      at: row.createdAt,
      type: "admin",
      title: row.summary,
      detail: `by ${row.actorEmail}`,
      source: "db",
    });
  }

  let cashfreeStatus: string | null = null;
  let attempts: CashfreeAttempt[] = [];
  if (payment.gateway === "cashfree") {
    try {
      const [order, list] = await Promise.all([fetchCashfreeOrder(payment.id), fetchCashfreeAttempts(payment.id)]);
      cashfreeStatus = order?.order_status || null;
      attempts = list;
      if (order?.order_status) {
        out.push({
          at: new Date(),
          type: "webhook",
          title: `Cashfree order now ${order.order_status}`,
          detail: "Live status from the Cashfree order API",
          status: order.order_status,
          source: "cashfree",
        });
      }
      for (const row of list) {
        const at = row.time || payment.createdAt;
        out.push({
          at,
          type: "cashfree.attempt",
          title: attemptTitle(row),
          detail: [row.error || row.message, row.cfPaymentId && `cf_payment_id ${row.cfPaymentId}`].filter(Boolean).join(" · ") || null,
          status: row.status,
          source: "cashfree",
        });
        await logEvent({
          type: "cashfree.attempt",
          at,
          email: payment.email,
          phone: payment.phone,
          paymentId: payment.id,
          amountInr: row.amountInr ?? payment.amountInr,
          status: row.status,
          summary: attemptTitle(row) + (row.error || row.message ? `: ${row.error || row.message}` : ""),
          detail: row.cfPaymentId ? `cf_payment_id ${row.cfPaymentId}` : null,
          isTest: payment.isTest,
          dedupeKey: `cashfree.attempt:${payment.id}:${row.cfPaymentId || `${row.status}:${at.toISOString()}`}`,
        });
      }
    } catch (error) {
      console.error("journey cashfree", error);
    }
  }

  out.sort((a, b) => a.at.getTime() - b.at.getTime() || a.title.localeCompare(b.title));

  const stopPoint = stopPointFrom({
    status: payment.status,
    gateway: payment.gateway,
    attempts,
    cashfreeStatus,
  });

  const claritySessionId = readClaritySessionId(payment.claritySessionId || lead?.claritySessionId);
  return {
    events: out,
    stopPoint,
    cashfreeStatus,
    claritySessionId,
    clarityUrl: clarityPlayerUrl(claritySessionId),
  };
}

export function formatIstSeconds(date: Date) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${formatted} IST`;
}

export { formatIst };
