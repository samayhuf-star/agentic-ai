import { pricing } from "@/lib/config";
import { payuRequestHash, type GatewayName } from "@/lib/payments/signature";
import type { CheckoutInput } from "@/lib/payments/types";

export function gatewayHasKeys(gateway: GatewayName) {
  if (gateway === "cashfree") return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
  if (gateway === "razorpay") return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  return Boolean(process.env.PAYU_MERCHANT_KEY && process.env.PAYU_SALT);
}

export function cashfreeTarget() {
  const raw = (process.env.CASHFREE_ENV || "TEST").trim().toUpperCase();
  const production = raw === "PROD" || raw === "PRODUCTION";
  return {
    apiBase: production ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
    mode: production ? "production" : "sandbox",
  };
}

export async function createHostedCheckout(input: CheckoutInput): Promise<{ url: string }> {
  if (input.gateway === "cashfree") return createCashfree(input);
  if (input.gateway === "razorpay") return createRazorpay(input);
  return createPayu(input);
}

export const CASHFREE_METHODS = "cc,dc,upi,nb,app";
export const CHECKOUT_TTL_MS = 30 * 60 * 1000;

/** ISO time in IST, now + 30 minutes (Cashfree needs at least 15). */
export function cashfreeExpiry(now = Date.now()) {
  const ist = new Date(now + CHECKOUT_TTL_MS + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().replace(/\.\d{3}Z$/, "+05:30");
}

export function cashfreeStartUrl(origin: string, sessionId: string) {
  return `${origin}/checkout/start?session=${encodeURIComponent(sessionId)}&mode=${cashfreeTarget().mode}`;
}

async function createCashfree(input: CheckoutInput) {
  const cashfree = cashfreeTarget();
  const response = await fetch(`${cashfree.apiBase}/orders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-version": "2025-01-01",
      "x-client-id": process.env.CASHFREE_APP_ID || "",
      "x-client-secret": process.env.CASHFREE_SECRET_KEY || "",
    },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amountInr,
      order_currency: "INR",
      order_expiry_time: cashfreeExpiry(),
      customer_details: {
        customer_id: input.orderId,
        customer_name: input.customer.name,
        customer_email: input.customer.email,
        customer_phone: input.customer.phone,
      },
      order_meta: {
        return_url: `${input.origin}/payment/success?order_id=${input.orderId}`,
        notify_url: `${input.origin}/api/webhooks/cashfree`,
        // Instant methods only: cards, UPI, net banking, wallets. No bank transfer, EMI or pay later.
        payment_methods: CASHFREE_METHODS,
      },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { payment_session_id?: string; message?: string };
  if (!response.ok || !body.payment_session_id) {
    throw new Error(body.message || "Cashfree did not open a checkout.");
  }
  return { url: cashfreeStartUrl(input.origin, body.payment_session_id) };
}

async function createRazorpay(input: CheckoutInput) {
  const key = process.env.RAZORPAY_KEY_ID || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: input.amountInr * 100,
      currency: "INR",
      accept_partial: false,
      description: `AI Time Machine, one payment of ${pricing().inr} rupees`,
      notify: { sms: false, email: false },
      reminder_enable: false,
      customer: { name: input.customer.name, email: input.customer.email, contact: input.customer.phone },
      notes: { order_id: input.orderId },
      callback_url: `${input.origin}/payment/success?order_id=${input.orderId}`,
      callback_method: "get",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { short_url?: string; error?: { description?: string } };
  if (!response.ok || !body.short_url) {
    throw new Error(body.error?.description || "Razorpay did not open a checkout.");
  }
  return { url: body.short_url };
}

async function createPayu(input: CheckoutInput) {
  const key = process.env.PAYU_MERCHANT_KEY || "";
  const salt = process.env.PAYU_SALT || "";
  const amount = input.amountInr.toFixed(2);
  const productinfo = "AI Time Machine";
  const firstname = input.customer.name.slice(0, 60);
  const email = input.customer.email;
  const hash = payuRequestHash({
    key,
    txnid: input.orderId,
    amount,
    productinfo,
    firstname,
    email,
    udf1: input.orderId,
    salt,
  });
  const params = new URLSearchParams({
    order: input.orderId,
    key,
    txnid: input.orderId,
    amount,
    productinfo,
    firstname,
    email,
    phone: input.customer.phone,
    surl: `${input.origin}/payment/success?order_id=${input.orderId}`,
    furl: `${input.origin}/payment/success?order_id=${input.orderId}`,
    udf1: input.orderId,
    hash,
  });
  return { url: `${input.origin}/checkout/payu?${params.toString()}` };
}

export function payuAction() {
  return process.env.PAYU_ENV === "production" ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment";
}
