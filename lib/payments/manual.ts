import { isEmail } from "@/lib/auth";
import { sendFulfilmentCode } from "@/lib/payments/sign-in-code";
import { fetchCashfreeOrder } from "@/lib/payments/cashfree-order";
import { fulfillPayment } from "@/lib/payments/fulfill";
import { prisma } from "@/lib/prisma";
import type { GatewayName } from "@/lib/payments/signature";

export async function fulfilOrder(orderId: string, extra?: { email?: string | null }) {
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment) return { ok: false as const, status: 404, message: "That order was not found." };
  if (payment.isTest) return { ok: false as const, status: 409, message: "Test payments are not fulfilled.", cashfreeStatus: null };

  let cashfreeStatus: string | null = null;
  let remoteEmail: string | null = null;
  let remotePhone: string | null = null;
  let remoteName: string | null = null;
  let remoteAmount: number | null = null;
  if (payment.gateway === "cashfree") {
    try {
      const body = await fetchCashfreeOrder(orderId);
      if (body) {
        cashfreeStatus = String(body.order_status || "").toUpperCase() || null;
        remoteEmail = body.customer_details?.customer_email || null;
        remotePhone = body.customer_details?.customer_phone || null;
        remoteName = body.customer_details?.customer_name || null;
        remoteAmount = body.order_amount != null ? Math.round(Number(body.order_amount)) : null;
      }
    } catch (error) {
      console.error(error);
    }
  }

  const supplied = (extra?.email || "").trim().toLowerCase();
  const email = isEmail(supplied) ? supplied : null;
  if (supplied && !email) return { ok: false as const, status: 400, message: "Enter a valid email.", cashfreeStatus };

  const alreadyPaid = payment.status === "paid" || payment.status === "paid_unassigned";
  const remotePaid = cashfreeStatus === "PAID";
  if (!alreadyPaid && !remotePaid) {
    const seen = cashfreeStatus || payment.status;
    return { ok: false as const, status: 409, message: `This order is ${seen}. It is not paid yet.`, cashfreeStatus };
  }

  if (email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && payment.userId && taken.id !== payment.userId) {
      return { ok: false as const, status: 409, message: "That email is already used by another account.", cashfreeStatus };
    }
    await prisma.payment.update({ where: { id: orderId }, data: { email } });
  }

  const hadUser = Boolean(payment.userId);
  const gateway = (payment.gateway === "razorpay" || payment.gateway === "payu" ? payment.gateway : "cashfree") as GatewayName;
  await fulfillPayment(gateway, {
    orderId,
    status: "paid",
    amountInr: remoteAmount ?? payment.amountInr,
    phone: remotePhone || payment.phone,
    email: email || remoteEmail || payment.email,
    name: remoteName || payment.name,
    gatewayPaymentId: payment.gatewayPaymentId,
    raw: { source: "manual", cashfreeStatus },
  });

  const updated = await prisma.payment.findUnique({ where: { id: orderId } });
  const target = updated?.email || email;
  if (hadUser && target && isEmail(target)) {
    const mailed = await sendFulfilmentCode(orderId, target, "resend");
    if (!mailed.ok) return { ok: false as const, status: mailed.status, message: mailed.message, cashfreeStatus };
  }
  if (!updated?.userId) {
    return {
      ok: false as const,
      status: 409,
      message: "Cashfree shows this as paid, but there is no email to send the code to. Enter the buyer's email and try again.",
      cashfreeStatus,
    };
  }
  return {
    ok: true as const,
    status: 200,
    message: `Code sent to ${updated.email}.`,
    cashfreeStatus,
    email: updated.email,
  };
}
