import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/config";
import { hashSecret, randomToken } from "@/lib/crypto";
import { isPlaceholderPhone, normalizePhone } from "@/lib/phone";
import { sendText } from "@/lib/messaging/sms";
import { queueOwnerAlert } from "@/lib/alerts/notify";
import { markLeadFailed, markLeadPaid } from "@/lib/leads";
import type { PaidEvent } from "@/lib/payments/types";
import type { GatewayName } from "@/lib/payments/signature";

export async function fulfillPayment(gateway: GatewayName, event: PaidEvent) {
  if (!event.orderId || event.status === "ignored") return { ok: true, ignored: true };
  const payment = await prisma.payment.findUnique({ where: { id: event.orderId } });
  if (event.status === "failed") {
    if (payment && payment.status === "pending") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed", raw: event.raw as Prisma.InputJsonValue, gatewayPaymentId: event.gatewayPaymentId },
      });
      await markLeadFailed(payment.id, "failed");
      queueOwnerAlert({
        kind: "payment_failed",
        dedupeKey: `payment_failed:${payment.id}`,
        phone: event.phone || payment.phone,
        amountInr: event.amountInr ?? payment.amountInr,
        orderId: payment.id,
        status: "failed",
      });
    }
    return { ok: true, failed: true };
  }

  if (payment?.status === "paid") return { ok: true, duplicate: true };

  const phone = normalizePhone(event.phone);
  const amountInr = event.amountInr ?? payment?.amountInr ?? 0;
  if (!phone || isPlaceholderPhone(phone)) {
    await prisma.payment.upsert({
      where: { id: event.orderId },
      update: {
        status: "paid_unassigned",
        paidAt: new Date(),
        phone: phone || event.phone,
        raw: event.raw as Prisma.InputJsonValue,
        gatewayPaymentId: event.gatewayPaymentId,
      },
      create: {
        id: event.orderId,
        gateway,
        amountInr,
        status: "paid_unassigned",
        phone: phone || event.phone,
        paidAt: new Date(),
        raw: event.raw as Prisma.InputJsonValue,
        gatewayPaymentId: event.gatewayPaymentId,
      },
    });
    await markLeadPaid({ orderId: event.orderId, amountInr, phone: phone || event.phone });
    queueOwnerAlert({
      kind: "payment_received",
      dedupeKey: `payment_received:${event.orderId}`,
      phone: phone || event.phone,
      amountInr,
      orderId: event.orderId,
      status: "paid, phone not saved",
    });
    return { ok: true, unassigned: true };
  }

  const token = randomToken();
  const tokenHash = hashSecret(token);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { phone } });
    const saved = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: existing.email
            ? {}
            : { emailTokenHash: tokenHash, emailTokenExpires: expires },
        })
      : await tx.user.create({
          data: { phone, emailTokenHash: tokenHash, emailTokenExpires: expires },
        });
    await tx.payment.upsert({
      where: { id: event.orderId },
      update: {
        status: "paid",
        userId: saved.id,
        phone,
        paidAt: new Date(),
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
        paidAt: new Date(),
        raw: event.raw as Prisma.InputJsonValue,
        gatewayPaymentId: event.gatewayPaymentId,
      },
    });
    return saved;
  });

  await markLeadPaid({ orderId: event.orderId, amountInr, phone, userId: user.id, email: user.email, name: user.businessName });
  queueOwnerAlert({
    kind: "payment_received",
    dedupeKey: `payment_received:${event.orderId}`,
    name: user.businessName,
    email: user.email,
    phone,
    amountInr,
    orderId: event.orderId,
    status: "paid",
  });

  if (!user.email) {
    const origin = appOrigin();
    const message = `AI Time Machine: payment received. Add your email to open your team: ${origin}/welcome?token=${token}`;
    await sendText(phone, message);
    await prisma.payment.update({ where: { id: event.orderId }, data: { smsSentAt: new Date() } });
  }
  return { ok: true, userId: user.id };
}
