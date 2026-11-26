import { NextResponse } from "next/server";
import { appOrigin, mockPaymentsAllowed } from "@/lib/config";
import { mockSignature } from "@/lib/payments/signature";
import { handleWebhook } from "@/lib/payments/webhook";
import { prisma } from "@/lib/prisma";
import { isGateway } from "@/lib/payments/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!mockPaymentsAllowed()) {
    return NextResponse.json({ message: "Test payments are turned off." }, { status: 404 });
  }
  const contentType = request.headers.get("content-type") || "";
  let orderId = "";
  let phone = "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { orderId?: string; phone?: string };
    orderId = body.orderId || "";
    phone = body.phone || "";
  } else {
    const form = await request.formData();
    orderId = String(form.get("orderId") || "");
    phone = String(form.get("phone") || "");
  }
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment || !isGateway(payment.gateway)) {
    return NextResponse.json({ message: "That test payment could not be found." }, { status: 404 });
  }
  const payload =
    payment.gateway === "stripe"
      ? JSON.stringify({
          type: "checkout.session.completed",
          data: {
            object: {
              id: `cs_test_${payment.id}`,
              client_reference_id: payment.id,
              payment_status: "paid",
              amount_total: payment.amountUsdCents ?? 4999,
              currency: "usd",
              customer_email: payment.email,
              customer_details: {
                email: payment.email,
                name: payment.name,
                phone: phone || payment.phone,
              },
              payment_intent: `pi_test_${payment.id}`,
              metadata: { orderId: payment.id, market: "us" },
            },
          },
        })
      : payment.gateway === "razorpay"
      ? JSON.stringify({
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: `pay_${payment.id}`,
                amount: payment.amountInr * 100,
                contact: phone,
                notes: { order_id: payment.id },
                status: "captured",
              },
            },
          },
        })
      : payment.gateway === "payu"
        ? JSON.stringify({ status: "success", udf1: payment.id, phone, amount: String(payment.amountInr), mihpayid: `payu_${payment.id}` })
        : JSON.stringify({
            type: "PAYMENT_SUCCESS_WEBHOOK",
            data: {
              order: { order_id: payment.id, order_amount: payment.amountInr, order_currency: "INR" },
              payment: { cf_payment_id: `test_${payment.id}`, payment_status: "SUCCESS" },
              customer_details: {
                customer_phone: phone || payment.phone,
                customer_email: payment.email,
                customer_name: payment.name,
              },
            },
          });
  const headers = new Headers({
    "content-type": "application/json",
    "x-ai-time-machine-mock-signature": mockSignature(payload),
  });
  const gateway = payment.gateway === "cashfree" ? "cashfree" : payment.gateway;
  const result = await handleWebhook(gateway, payload, headers);
  if (result.status !== 200) return NextResponse.json(result.body, { status: result.status });
  return NextResponse.redirect(new URL(`/payment/success?order_id=${payment.id}`, appOrigin(request)), 303);
}
