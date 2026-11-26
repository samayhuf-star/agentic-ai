import {
  verifyCashfreeSignature,
  verifyPayuSignature,
  verifyRazorpaySignature,
  isGateway,
  type GatewayName,
} from "@/lib/payments/signature";
import { parseCashfreeEvent, parseFormOrJson, parsePayuEvent, parseRazorpayEvent } from "@/lib/payments/parse";
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
  await fulfillPayment(gatewayName, event);
  if (gatewayName === "cashfree" && event.status === "paid" && event.orderId) await markCashfreeConfirmed(event.orderId, "webhook");
  // Failed or dropped payment: recovery email #1 right away (no-op unless RECOVERY_EMAILS=on).
  if (gatewayName === "cashfree" && event.orderId && (event.status === "failed" || raw.includes("USER_DROPPED"))) {
    await triggerRecovery(event.orderId).catch((error) => console.error("recovery trigger", error));
  }
  return { status: 200, body: { ok: true } };
}

function verify(gateway: GatewayName, raw: string, headers: Headers, contentType: string) {
  if (gateway === "cashfree") return verifyCashfreeSignature(raw, headers);
  if (gateway === "razorpay") return verifyRazorpaySignature(raw, headers);
  return verifyPayuSignature(raw, headers, contentType);
}
