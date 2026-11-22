import { pricing } from "@/lib/config";
import { payuRequestHash, type GatewayName } from "@/lib/payments/signature";
import type { CheckoutInput } from "@/lib/payments/types";

const PLACEHOLDER_PHONE = "9999999999";

export function gatewayHasKeys(gateway: GatewayName) {
  if (gateway === "cashfree") return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
  if (gateway === "razorpay") return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  return Boolean(process.env.PAYU_MERCHANT_KEY && process.env.PAYU_SALT);
}

function cashfreeBase() {
  return process.env.CASHFREE_ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

export async function createHostedCheckout(input: CheckoutInput): Promise<{ url: string }> {
  if (input.gateway === "cashfree") return createCashfree(input);
  if (input.gateway === "razorpay") return createRazorpay(input);
  return createPayu(input);
}

async function createCashfree(input: CheckoutInput) {
  const response = await fetch(`${cashfreeBase()}/orders`, {
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
      customer_details: {
        customer_id: input.orderId,
        customer_phone: PLACEHOLDER_PHONE,
      },
      order_note: "Replace the sample phone with your own mobile before you pay.",
      order_meta: {
        return_url: `${input.origin}/checkout/return?order_id=${input.orderId}`,
      },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { payment_session_id?: string; message?: string };
  if (!response.ok || !body.payment_session_id) {
    throw new Error(body.message || "Cashfree did not open a checkout.");
  }
  const mode = process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
  return { url: `${input.origin}/checkout/start?session=${encodeURIComponent(body.payment_session_id)}&mode=${mode}` };
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
      description: `Boardroom, one payment of ${pricing().inr} rupees`,
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: { order_id: input.orderId },
      callback_url: `${input.origin}/checkout/return?order_id=${input.orderId}`,
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
  const productinfo = "Boardroom";
  const firstname = "Owner";
  const email = "buyer@adiology.io";
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
    phone: PLACEHOLDER_PHONE,
    surl: `${input.origin}/checkout/return?order_id=${input.orderId}`,
    furl: `${input.origin}/checkout/return?order_id=${input.orderId}`,
    udf1: input.orderId,
    hash,
  });
  return { url: `${input.origin}/checkout/payu?${params.toString()}` };
}

export function payuAction() {
  return process.env.PAYU_ENV === "production" ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment";
}
