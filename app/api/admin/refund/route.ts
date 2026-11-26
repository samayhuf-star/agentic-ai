import { denyStaffMutation, json, readJson, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { syncCommission } from "@/lib/affiliates/commission";
import { logEvent, paymentSource } from "@/lib/activity/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const staffDenied = await denyStaffMutation(request);
  if (staffDenied) return staffDenied;
  const session = await requireAdmin(request);
  if (!session) return json({ message: "Sign in as an admin first." }, 401);
  const body = await readJson(request);
  const orderId = String(body.orderId || "");
  if (!orderId) return json({ message: "That order was not found." }, 404);
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment) return json({ message: "That order was not found." }, 404);
  if (payment.status !== "paid") return json({ message: "Only a paid order can be marked refunded." }, 409);
  await prisma.payment.update({
    where: { id: orderId },
    data: { status: "refunded", refundedAt: new Date(), refundedBy: session.email },
  });
  await syncCommission(orderId);
  await logEvent({
    type: "payment.refunded",
    email: payment.email,
    phone: payment.phone,
    userId: payment.userId,
    paymentId: orderId,
    amountInr: payment.amountInr,
    source: paymentSource(payment),
    status: "refunded",
    summary: `Refunded ₹${payment.amountInr.toLocaleString("en-IN")} by ${session.email}`,
    isTest: payment.isTest,
    tag: "admin",
    dedupeKey: `payment.refunded:${orderId}`,
  });
  return json({ ok: true, message: "Marked refunded." });
}
