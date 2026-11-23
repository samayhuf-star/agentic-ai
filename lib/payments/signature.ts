import { createHash } from "node:crypto";
import { hmacBase64, hmacHex, safeEqual } from "@/lib/crypto";
import { mockPaymentsAllowed } from "@/lib/config";

export type GatewayName = "cashfree" | "razorpay" | "payu";

export function isGateway(value: string): value is GatewayName {
  return value === "cashfree" || value === "razorpay" || value === "payu";
}

export function mockSignature(raw: string) {
  const secret = process.env.MOCK_WEBHOOK_SECRET || "dev-only-mock-secret";
  return hmacHex(secret, raw);
}

function mockHeaderOk(raw: string, headers: Headers) {
  if (!mockPaymentsAllowed()) return false;
  const got = headers.get("x-ai-time-machine-mock-signature") || "";
  return safeEqual(mockSignature(raw), got);
}

export function verifyCashfreeSignature(raw: string, headers: Headers) {
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (secret) {
    const timestamp = headers.get("x-webhook-timestamp") || "";
    const received = headers.get("x-webhook-signature") || "";
    const expected = hmacBase64(secret, timestamp + raw);
    return safeEqual(expected, received);
  }
  return mockHeaderOk(raw, headers);
}

export function verifyRazorpaySignature(raw: string, headers: Headers) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (secret && process.env.RAZORPAY_KEY_ID) {
    const received = headers.get("x-razorpay-signature") || "";
    const expected = hmacHex(secret, raw);
    return safeEqual(expected, received);
  }
  return mockHeaderOk(raw, headers);
}

export function payuRequestHash(fields: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1: string;
  salt: string;
}) {
  const parts = [
    fields.key,
    fields.txnid,
    fields.amount,
    fields.productinfo,
    fields.firstname,
    fields.email,
    fields.udf1,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    fields.salt,
  ];
  return createHash("sha512").update(parts.join("|")).digest("hex");
}

export function payuResponseHash(fields: Record<string, string>, salt: string) {
  const parts = [
    salt,
    fields.status || "",
    "",
    "",
    "",
    "",
    "",
    fields.udf5 || "",
    fields.udf4 || "",
    fields.udf3 || "",
    fields.udf2 || "",
    fields.udf1 || "",
    fields.email || "",
    fields.firstname || "",
    fields.productinfo || "",
    fields.amount || "",
    fields.txnid || "",
    fields.key || "",
  ];
  return createHash("sha512").update(parts.join("|")).digest("hex");
}

export function verifyPayuSignature(raw: string, headers: Headers, contentType: string) {
  const salt = process.env.PAYU_SALT;
  const key = process.env.PAYU_MERCHANT_KEY;
  if (salt && key && contentType.includes("application/x-www-form-urlencoded")) {
    const params = Object.fromEntries(new URLSearchParams(raw).entries());
    if (!params.hash) return false;
    const expected = payuResponseHash(params, salt);
    return safeEqual(expected.toLowerCase(), params.hash.toLowerCase());
  }
  return mockHeaderOk(raw, headers);
}
