import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isEmail } from "@/lib/auth";
import { sendFulfilmentCode } from "@/lib/payments/sign-in-code";
import { queueOwnerAlert } from "@/lib/alerts/notify";
import { markLeadFailed, markLeadPaid, saveBuyerContact } from "@/lib/leads";
import { indianMobile } from "@/lib/phone";
import { ensureTeam } from "@/lib/team";
import { syncCommission } from "@/lib/affiliates/commission";
import type { PaidEvent } from "@/lib/payments/types";
import type { GatewayName } from "@/lib/payments/signature";
import { eventTag, logEvent, paymentSource } from "@/lib/activity/log";

function chosenEmail(remote?: string | null, stored?: string | null) {
  const storedEmail = (stored || "").trim().toLowerCase();
  if (isEmail(storedEmail)) return storedEmail;
  const remoteEmail = (remote || "").trim().toLowerCase();
  return isEmail(remoteEmail) ? remoteEmail : null;
}

function chosenPhone(remote?: string | null, stored?: string | null) {
  const storedMobile = indianMobile(stored);
  if (storedMobile.ok) return storedMobile.e164;
  const remoteMobile = indianMobile(remote);
  return remoteMobile.ok ? remoteMobile.e164 : null;
}

function chosenName(remote?: string | null, stored?: string | null) {
  const storedName = (stored || "").trim();
  if (storedName) return storedName.slice(0, 80);
  const remoteName = (remote || "").trim();
  return remoteName ? remoteName.slice(0, 80) : null;
}

async function phoneIsFree(tx: Prisma.TransactionClient, phone: string, exceptUserId?: string) {
  const owner = await tx.user.findUnique({ where: { phone } });
  return !owner || owner.id === exceptUserId;
}

function eventMatchesOrder(payment: { gateway: string; amountInr: number } | null, gateway: GatewayName, event: PaidEvent) {
  if (!payment) return false;
  if (payment.gateway !== gateway) return false;
  if (event.amountInr == null || event.amountInr !== payment.amountInr) return false;
  return (event.currency || "").toUpperCase() === "INR";
}

export async function fulfillPayment(gateway: GatewayName, event: PaidEvent) {
  const result = await fulfillPaymentInner(gateway, event);
  if (event.orderId) await syncCommission(event.orderId);
  return result;
}

async function fulfillPaymentInner(gateway: GatewayName, event: PaidEvent) {
  if (!event.orderId || event.status === "ignored") return { ok: true, ignored: true };
  const payment = await prisma.payment.findUnique({ where: { id: event.orderId } });
  if (payment?.isTest) return { ok: true, ignored: true };
  if (event.status === "paid" || event.status === "failed") {
    if (!eventMatchesOrder(payment, gateway, event)) return { ok: false, rejected: true };
  }
  if (event.status === "failed") {
    if (payment && payment.status === "pending") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed", raw: event.raw as Prisma.InputJsonValue, gatewayPaymentId: event.gatewayPaymentId },
      });
      await markLeadFailed(payment.id, "failed");
      await saveBuyerContact({
        orderId: payment.id,
        phone: event.phone || payment.phone,
        email: event.email || payment.email,
        name: event.name || payment.name,
        amountInr: event.amountInr ?? payment.amountInr,
      });
      queueOwnerAlert({
        kind: "payment_failed",
        dedupeKey: `payment_failed:${payment.id}`,
        name: event.name || payment.name,
        phone: event.phone || payment.phone,
        email: event.email || payment.email,
        amountInr: event.amountInr ?? payment.amountInr,
        orderId: payment.id,
        status: "failed",
      });
      await logEvent({
        type: "payment.failed",
        email: event.email || payment.email,
        phone: event.phone || payment.phone,
        userId: payment.userId,
        paymentId: payment.id,
        amountInr: event.amountInr ?? payment.amountInr,
        source: paymentSource(payment),
        status: "failed",
        summary: `Payment failed for ${payment.id}`,
        isTest: payment.isTest,
        dedupeKey: `payment.failed:${payment.id}`,
      });
    }
    return { ok: true, failed: true };
  }

  if (payment?.status === "paid" && payment.userId) {
    const already = chosenEmail(event.email, payment.email);
    if (already) await sendFulfilmentCode(event.orderId, already, "once");
    return { ok: true, duplicate: true, userId: payment.userId };
  }

  const phone = chosenPhone(event.phone, payment?.phone);
  const email = chosenEmail(event.email, payment?.email);
  const name = chosenName(event.name, payment?.name);
  const amountInr = event.amountInr ?? payment?.amountInr ?? 0;

  if (!email) {
    await prisma.payment.upsert({
      where: { id: event.orderId },
      update: {
        status: "paid",
        paidAt: new Date(),
        phone,
        name,
        raw: event.raw as Prisma.InputJsonValue,
        gatewayPaymentId: event.gatewayPaymentId,
      },
      create: {
        id: event.orderId,
        gateway,
        amountInr,
        status: "paid",
        phone,
        name,
        paidAt: new Date(),
        raw: event.raw as Prisma.InputJsonValue,
        gatewayPaymentId: event.gatewayPaymentId,
      },
    });
    await markLeadPaid({ orderId: event.orderId, amountInr, phone, name });
    queueOwnerAlert({
      kind: "payment_received",
      dedupeKey: `payment_received:${event.orderId}`,
      name,
      phone,
      amountInr,
      orderId: event.orderId,
      status: "paid, email not saved",
    });
    await logEvent({
      type: "payment.paid",
      email,
      phone,
      paymentId: event.orderId,
      amountInr,
      source: payment ? paymentSource(payment) : null,
      status: "paid",
      summary: `Paid ₹${amountInr.toLocaleString("en-IN")} (${gateway}, email not saved)`,
      isTest: payment?.isTest,
      dedupeKey: `payment.paid:${event.orderId}`,
    });
    return { ok: true, needsEmail: true };
  }

  let user;
  let created = false;
  try {
    const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    const canUsePhone = phone ? await phoneIsFree(tx, phone, existing?.id) : false;
    const saved = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            phone: existing.phone || (canUsePhone ? phone : undefined),
          },
        })
      : await tx.user.create({
          data: {
            email,
            phone: canUsePhone ? phone : null,
          },
        });
    await tx.payment.upsert({
      where: { id: event.orderId },
      update: {
        status: "paid",
        userId: saved.id,
        phone,
        email,
        name,
        paidAt: payment?.paidAt ?? new Date(),
        amountInr: amountInr || undefined,
        gateway,
        raw: event.raw as Prisma.InputJsonValue,
        gatewayPaymentId: event.gatewayPaymentId,
      },
      create: {
        id: event.orderId,
        gateway,
        amountInr,
        status: "paid",
        userId: saved.id,
        phone,
        email,
        name,
        paidAt: new Date(),
        raw: event.raw as Prisma.InputJsonValue,
        gatewayPaymentId: event.gatewayPaymentId,
      },
    });
    return { saved, created: !existing };
  });
    user = result.saved;
    created = result.created;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) throw error;
    await prisma.payment.update({
      where: { id: event.orderId },
      data: {
        status: "paid",
        userId: existing.id,
        phone,
        email,
        name,
        paidAt: new Date(),
        amountInr: amountInr || undefined,
        gateway,
        raw: event.raw as Prisma.InputJsonValue,
        gatewayPaymentId: event.gatewayPaymentId,
      },
    });
    user = existing;
  }

  if (created) {
    await logEvent({
      type: "signup",
      email,
      phone,
      userId: user.id,
      summary: `Account created for ${email}`,
      tag: eventTag({ email }),
      dedupeKey: `signup:${user.id}`,
    });
  }
  await logEvent({
    type: "payment.paid",
    email,
    phone,
    userId: user.id,
    paymentId: event.orderId,
    amountInr,
    source: payment ? paymentSource(payment) : null,
    status: "paid",
    summary: `Paid ₹${amountInr.toLocaleString("en-IN")} (${gateway})`,
    isTest: payment?.isTest,
    dedupeKey: `payment.paid:${event.orderId}`,
  });

  await ensureTeam(user.id);
  await markLeadPaid({ orderId: event.orderId, amountInr, phone, userId: user.id, email, name });
  queueOwnerAlert({
    kind: "payment_received",
    dedupeKey: `payment_received:${event.orderId}`,
    name: user.businessName || name,
    email,
    phone,
    amountInr,
    orderId: event.orderId,
    status: "paid",
  });

  const mailed = await sendFulfilmentCode(event.orderId, email, "once");
  if (!mailed.ok) console.error("sign-in code", mailed.message);
  return { ok: true, userId: user.id, email };
}
