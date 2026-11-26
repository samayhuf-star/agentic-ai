import {
  verifyCashfreeSignature,
  verifyPayuSignature,
  verifyRazorpaySignature,
  isGateway,
  type GatewayName,
} from "@/lib/payments/signature";
import { cashfreeWebhookMeta, parseCashfreeEvent, parseFormOrJson, parsePayuEvent, parseRazorpayEvent } from "@/lib/payments/parse";
import { logEvent } from "@/lib/activity/log";
import { fulfillPayment } from "@/lib/payments/fulfill";
import { markCashfreeConfirmed } from "@/lib/payments/confirmed";
import { triggerRecovery } from "@/lib/followups/recovery";

export async function handleWebhook(gatewayName: string, raw: string, headers: Headers) {
  if (!isGateway(gatewayName)) return { status: 404, body: { message: "Unknown payment gateway." } };
  const contentType = headers.get("content-type") || "";
  const trusted = verify(gatewayName, raw, headers, contentType);
  if (!trusted) return { status: 401, body: { message: "Signature did not match." } };
  let payload: unknown;
  try {
    payload = parseFormOrJson(raw, contentType);
  } catch {
    return { status: 400, body: { message: "Could not read the payment message." } };
  }
  const event =
    gatewayName === "cashfree"
      ? parseCashfreeEvent(payload)
      : gatewayName === "razorpay"
        ? parseRazorpayEvent(payload)
        : parsePayuEvent(payload);
  const meta = gatewayName === "cashfree" ? cashfreeWebhookMeta(payload) : null;
  const attemptStatus = meta?.paymentStatus || event.status;
  await logEvent({
    type: "webhook",
    email: event.email,
    phone: event.phone,
    paymentId: event.orderId || meta?.orderId,
    amountInr: event.amountInr ?? meta?.amountInr,
    status: attemptStatus,
    summary: `${gatewayName} webhook ${meta?.type || event.status} for ${event.orderId || meta?.orderId || "unknown"}`,
    detail: [meta?.method && `via ${meta.method}`, meta?.error, meta?.cfPaymentId && `cf_payment_id ${meta.cfPaymentId}`].filter(Boolean).join(" · ") || null,
    dedupeKey: `webhook:${gatewayName}:${meta?.type || event.status}:${event.orderId || meta?.orderId || "x"}:${meta?.cfPaymentId || event.gatewayPaymentId || Date.now()}`,
  });
  if (gatewayName === "cashfree" && event.orderId && (meta?.paymentStatus || meta?.cfPaymentId)) {
    const why = meta?.error;
    const method = meta?.method ? ` via ${meta.method}` : "";
    await logEvent({
      type: "cashfree.attempt",
      email: event.email,
      phone: event.phone,
      paymentId: event.orderId,
      amountInr: event.amountInr ?? meta?.amountInr,
      status: meta?.paymentStatus || event.status,
      summary: `Cashfree ${meta?.paymentStatus || event.status}${method} for ${event.orderId}${why ? `: ${why}` : ""}`,
      detail: [meta?.cfPaymentId && `cf_payment_id ${meta.cfPaymentId}`, why].filter(Boolean).join(" · ") || null,
      dedupeKey: `cashfree.attempt:${event.orderId}:${meta?.cfPaymentId || (meta?.paymentStatus || event.status) + String(Date.now())}`,
    });
  }
  await fulfillPayment(gatewayName, event);
  if (gatewayName === "cashfree" && event.status === "paid" && event.orderId) await markCashfreeConfirmed(event.orderId, "webhook");
  // Failed or dropped payment: recovery email #1 right away (no-op unless RECOVERY_EMAILS=on).
  if (gatewayName === "cashfree" && event.orderId && (event.status === "failed" || /USER_DROPPED|ORDER_EXPIRED|PAYMENT_EXPIRED|EXPIRED/.test(raw))) {
    await triggerRecovery(event.orderId).catch((error) => console.error("recovery trigger", error));
  }
  return { status: 200, body: { ok: true } };
}

function verify(gateway: GatewayName, raw: string, headers: Headers, contentType: string) {
  if (gateway === "cashfree") return verifyCashfreeSignature(raw, headers);
  if (gateway === "razorpay") return verifyRazorpaySignature(raw, headers);
  return verifyPayuSignature(raw, headers, contentType);
}
