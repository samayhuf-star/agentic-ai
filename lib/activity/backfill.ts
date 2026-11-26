import { eventTag, logEvent, paymentSource } from "@/lib/activity/log";
import { fetchCashfreeAttempts } from "@/lib/payments/cashfree-order";
import { prisma } from "@/lib/prisma";

const EXTRA_CASHFREE_ORDERS = [
  // Deleted local test/abandoned orders that may still have attempts at Cashfree.
  "brdeff38e6d9840b04",
  "br6b4764b43b4b9528",
  "brbc59650d70dfded7",
  "brd552897936455044",
  "br71c2b5825e9f8af1",
  "br9d02b3061b5078de",
  "brbb1cb9d35c488f9b",
  "bradb79f939a29a6a3",
  "br754e0b809a660ac3",
  "br680d8cb59d6c9297",
  "br444fa5589fc986e2",
  "br2accc5fa1b014d2e",
  "br8ac694e7900e5d11",
  "brf550bdb99f513e53",
  "br40e2035664960854",
  "br512fa6a030ab54c8",
  "br38ffce318341a0f2",
  "br27268f7763c52977",
  "br5213cce0e2747a49",
  "br30a8b0baed4f4749",
  "br90571b84f688bee7",
  "br50c377520afe8a05",
  "brfc723a5cb7664861",
  "br0a5ff2258f2b3250",
  "br874a179177f5c4e7",
  "br1f7d12d366591e0f",
  "braf9d851235c37da4",
  "brd0726ad605ad7242",
  "br1a6e7907fdd1ea8c",
  "br62a6f5b361455a37",
];

function money(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export async function backfillSystemEvents(options: { cashfree?: boolean } = {}) {
  const users = await prisma.user.findMany();
  for (const user of users) {
    await logEvent({
      type: "signup",
      at: user.createdAt,
      email: user.email,
      phone: user.phone,
      userId: user.id,
      source: user.channelLast || user.channelFirst,
      summary: `Account created${user.email ? ` for ${user.email}` : user.phone ? ` for ${user.phone}` : ""}`,
      tag: eventTag({ email: user.email }),
      dedupeKey: `signup:${user.id}`,
    });
    if (user.onboardedAt) {
      await logEvent({
        type: "agent",
        at: user.onboardedAt,
        email: user.email,
        phone: user.phone,
        userId: user.id,
        summary: "Finished onboarding",
        status: "onboarded",
        tag: eventTag({ email: user.email }),
        dedupeKey: `agent:onboard:${user.id}`,
      });
    }
  }

  const sessions = await prisma.session.findMany();
  for (const session of sessions) {
    await logEvent({
      type: "login",
      at: session.createdAt,
      email: session.email,
      userId: session.userId,
      status: session.isAdmin ? "admin" : "ok",
      summary: `${session.email} signed in`,
      tag: eventTag({ email: session.email }),
      dedupeKey: `login:${session.id}`,
    });
  }

  const codes = await prisma.loginCode.findMany();
  for (const code of codes) {
    await logEvent({
      type: "otp",
      at: code.createdAt,
      email: code.email,
      summary: `Sign-in code emailed to ${code.email}`,
      status: "requested",
      tag: eventTag({ email: code.email }),
      dedupeKey: `otp:${code.id}`,
    });
  }

  const payments = await prisma.payment.findMany();
  for (const payment of payments) {
    const source = paymentSource(payment);
    const tag = eventTag({ email: payment.email, isTest: payment.isTest });
    const who = payment.email || payment.phone || payment.id;
    await logEvent({
      type: "checkout",
      at: payment.createdAt,
      email: payment.email,
      phone: payment.phone,
      userId: payment.userId,
      paymentId: payment.id,
      amountInr: payment.amountInr,
      source,
      status: "started",
      summary: `Checkout ${payment.id} for ${who} (${money(payment.amountInr)})`,
      detail: payment.name || payment.gateway,
      tag,
      isTest: payment.isTest,
      dedupeKey: `checkout:${payment.id}`,
    });
    if (payment.status === "paid" || payment.paidAt) {
      await logEvent({
        type: "payment.paid",
        at: payment.paidAt || payment.createdAt,
        email: payment.email,
        phone: payment.phone,
        userId: payment.userId,
        paymentId: payment.id,
        amountInr: payment.amountInr,
        source,
        status: payment.gatewayConfirmedAt ? "confirmed" : payment.status,
        summary: `Paid ${money(payment.amountInr)} (${payment.gateway}${payment.gatewayConfirmedVia ? `, ${payment.gatewayConfirmedVia}` : ""})`,
        tag,
        isTest: payment.isTest,
        dedupeKey: `payment.paid:${payment.id}`,
      });
    }
    if (payment.status === "failed") {
      await logEvent({
        type: "payment.failed",
        at: payment.updatedAt || payment.createdAt,
        email: payment.email,
        phone: payment.phone,
        userId: payment.userId,
        paymentId: payment.id,
        amountInr: payment.amountInr,
        source,
        status: "failed",
        summary: `Payment failed for ${payment.id}`,
        tag,
        isTest: payment.isTest,
        dedupeKey: `payment.failed:${payment.id}`,
      });
    }
    if (payment.refundedAt || payment.status === "refunded") {
      await logEvent({
        type: "payment.refunded",
        at: payment.refundedAt || payment.updatedAt || payment.createdAt,
        email: payment.email,
        phone: payment.phone,
        userId: payment.userId,
        paymentId: payment.id,
        amountInr: payment.amountInr,
        source,
        status: "refunded",
        summary: `Refunded ${money(payment.amountInr)}${payment.refundedBy ? ` by ${payment.refundedBy}` : ""}`,
        tag,
        isTest: payment.isTest,
        dedupeKey: `payment.refunded:${payment.id}`,
      });
    }
  }

  const visits = await prisma.marketingVisit.findMany();
  for (const visit of visits) {
    await logEvent({
      type: "visit",
      at: visit.createdAt,
      source: visit.source,
      status: visit.channel,
      summary: `Visited ${visit.path} from ${visit.source}`,
      detail: visit.campaign ? `Campaign ${visit.campaign}` : null,
      dedupeKey: `visit:${visit.id}`,
    });
  }

  const emails = await prisma.emailLog.findMany();
  for (const email of emails) {
    await logEvent({
      type: "email.sent",
      at: email.createdAt,
      email: email.toEmail,
      status: "sent",
      summary: `Email to ${email.toEmail}: ${email.subject}`,
      detail: `via ${email.provider}`,
      tag: eventTag({ email: email.toEmail }),
      dedupeKey: `email.sent:${email.id}`,
    });
  }

  const audits = await prisma.adminAudit.findMany();
  for (const row of audits) {
    await logEvent({
      type: "admin",
      at: row.createdAt,
      email: row.actorEmail,
      userId: row.entity === "customer" ? row.entityId : null,
      paymentId: row.entity === "payment" ? row.entityId : null,
      status: row.action,
      summary: row.summary,
      detail: `${row.actorEmail} · ${row.entity}${row.entityId ? ` ${row.entityId}` : ""}`,
      tag: "admin",
      dedupeKey: `admin:${row.id}`,
    });
  }

  const alerts = await prisma.alertLog.findMany({ where: { status: { not: "sent" } } });
  for (const alert of alerts) {
    await logEvent({
      type: "error",
      at: alert.createdAt,
      email: alert.toAddress,
      status: alert.status,
      summary: `Alert ${alert.kind} ${alert.status}: ${alert.subject}`,
      detail: (alert.error || alert.channel).slice(0, 1000),
      tag: "admin",
      dedupeKey: `error:alert:${alert.id}`,
    });
  }

  const approvals = await prisma.approval.findMany();
  for (const approval of approvals) {
    await logEvent({
      type: "agent",
      at: approval.createdAt,
      userId: approval.userId,
      status: approval.status,
      summary: `Approval: ${approval.title}`,
      detail: approval.detail.slice(0, 1000),
      dedupeKey: `agent:approval:${approval.id}`,
    });
  }

  const tasks = await prisma.task.findMany();
  for (const task of tasks) {
    await logEvent({
      type: "agent",
      at: task.createdAt,
      userId: task.userId,
      status: "task",
      summary: `Task: ${task.title}`,
      dedupeKey: `agent:task:${task.id}`,
    });
  }

  const recoveries = await prisma.followupSend.findMany({ where: { key: { startsWith: "recovery" } } });
  for (const row of recoveries) {
    await logEvent({
      type: "recovery_email_sent",
      at: row.createdAt,
      email: row.toEmail,
      status: row.step,
      summary: `Recovery ${row.step} to ${row.toEmail}`,
      dedupeKey: `recovery_email_sent:${row.key}`,
    });
  }

  if (options.cashfree === false) return;

  const liveIds = payments.filter((p) => p.gateway === "cashfree").map((p) => p.id);
  const checkedRow = await prisma.setting.findUnique({ where: { key: "activity:cashfree-checked" } });
  let checked = new Set<string>();
  try {
    const parsed = checkedRow?.value ? (JSON.parse(checkedRow.value) as unknown) : [];
    if (Array.isArray(parsed)) checked = new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    checked = new Set();
  }
  // Re-check live Cashfree orders every start (new attempts may appear). Skip already-checked deleted ids.
  const orderIds = Array.from(new Set([...liveIds, ...EXTRA_CASHFREE_ORDERS.filter((id) => !checked.has(id))]));
  const byId = new Map(payments.map((p) => [p.id, p]));
  const deadline = Date.now() + 45_000;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(5, orderIds.length) }, async () => {
    while (cursor < orderIds.length && Date.now() < deadline) {
      const orderId = orderIds[cursor++];
      try {
        const attempts = await fetchCashfreeAttempts(orderId);
        const payment = byId.get(orderId);
        const source = payment ? paymentSource(payment) : null;
        const tag = payment ? eventTag({ email: payment.email, isTest: payment.isTest }) : "test";
        for (const attempt of attempts) {
          const why = attempt.error || attempt.message;
          const method = attempt.method ? ` via ${attempt.method}` : "";
          await logEvent({
            type: "cashfree.attempt",
            at: attempt.time || payment?.createdAt || new Date(),
            email: payment?.email,
            phone: payment?.phone,
            userId: payment?.userId,
            paymentId: orderId,
            amountInr: attempt.amountInr ?? payment?.amountInr,
            source,
            status: attempt.status,
            summary: `Cashfree ${attempt.status}${method} for ${orderId}${why ? `: ${why}` : ""}`,
            detail: [attempt.cfPaymentId && `cf_payment_id ${attempt.cfPaymentId}`, why].filter(Boolean).join(" · ") || null,
            tag,
            isTest: payment?.isTest,
            dedupeKey: `cashfree.attempt:${orderId}:${attempt.cfPaymentId || attempt.status + String(attempt.time?.getTime() || 0)}`,
          });
        }
        checked.add(orderId);
      } catch (error) {
        console.error("cashfree attempt backfill failed", orderId, error instanceof Error ? error.message : "error");
      }
    }
  });
  if (workers.length) await Promise.all(workers);
  await prisma.setting.upsert({
    where: { key: "activity:cashfree-checked" },
    update: { value: JSON.stringify([...checked]) },
    create: { key: "activity:cashfree-checked", value: JSON.stringify([...checked]) },
  });
}
