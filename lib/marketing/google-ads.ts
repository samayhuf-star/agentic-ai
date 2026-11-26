import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { StoredTouch } from "@/lib/marketing/server";

/** Production AI Time Machine account, used only when env vars omit the ids. */
export const DEFAULT_ADS_CUSTOMER_ID = "9099283797";
export const DEFAULT_ADS_LOGIN_CUSTOMER_ID = "1870645876";
export const DEFAULT_ADS_CONVERSION_ACTION_ID = "7918381917";
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v21";

const CREDENTIAL_VARS = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
] as const;

export function missingGoogleAdsEnv() {
  return CREDENTIAL_VARS.filter((name) => !String(process.env[name] || "").trim());
}

export function googleAdsUploadConfigured() {
  return missingGoogleAdsEnv().length === 0;
}

export function enhancedConversionsEnabled() {
  return process.env.GOOGLE_ADS_ENHANCED_CONVERSIONS === "on";
}

function digits(value: string) {
  return value.replace(/-/g, "").trim();
}

function customerId() {
  return digits(process.env.GOOGLE_ADS_CUSTOMER_ID || DEFAULT_ADS_CUSTOMER_ID);
}

function loginCustomerId() {
  return digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || DEFAULT_ADS_LOGIN_CUSTOMER_ID);
}


function usCustomerId() {
  return digits(process.env.GOOGLE_ADS_US_CUSTOMER_ID || "");
}

function usLoginCustomerId() {
  return digits(process.env.GOOGLE_ADS_US_LOGIN_CUSTOMER_ID || "") || usCustomerId();
}

function usConversionActionName() {
  const customer = usCustomerId();
  const id = digits(process.env.GOOGLE_ADS_US_CONVERSION_ACTION_ID || "");
  if (!customer || !id) return null;
  return `customers/${customer}/conversionActions/${id}`;
}

export function usGoogleAdsUploadConfigured() {
  return googleAdsUploadConfigured() && Boolean(usConversionActionName());
}

/** Google Ads US account: `yyyy-mm-dd HH:mm:ss+HH:mm` in America/New_York. */
export function adsConversionDateTimeUs(at: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const rawOffset = (parts.find((p) => p.type === "timeZoneName")?.value || "GMT-05:00").replace("GMT", "");
  const offset = rawOffset === "Z" || rawOffset === "+00:00" ? "+00:00" : rawOffset;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}${offset}`;
}

function conversionActionName() {
  const id = digits(process.env.GOOGLE_ADS_CONVERSION_ACTION_ID || DEFAULT_ADS_CONVERSION_ACTION_ID);
  return `customers/${customerId()}/conversionActions/${id}`;
}

function sha256Norm(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function touchOf(raw: unknown): StoredTouch | null {
  return raw && typeof raw === "object" ? (raw as StoredTouch) : null;
}

export function clickIdsFromPayment(p: { gclid?: string | null; mktFirst?: unknown; mktLast?: unknown }) {
  const last = touchOf(p.mktLast);
  const first = touchOf(p.mktFirst);
  const gclid = (p.gclid || last?.g || first?.g || "").trim() || undefined;
  const gbraid = (last?.gb || first?.gb || "").trim() || undefined;
  const wbraid = (last?.w || first?.w || "").trim() || undefined;
  return { gclid, gbraid, wbraid };
}

/** Google Ads requires `yyyy-mm-dd HH:mm:ss+HH:mm` (IST for this INR account). */
export function adsConversionDateTime(at: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}+05:30`;
}

type Token = { access: string; expiresAt: number };
let cached: Token | null = null;

async function accessToken() {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.access;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!.trim(),
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!.trim(),
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!.trim(),
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(`Google OAuth ${response.status}: ${json.error || "token failed"}`);
  }
  cached = { access: json.access_token, expiresAt: Date.now() + Math.max(30, json.expires_in || 3500) * 1000 };
  return cached.access;
}

export function clickConversionPayload(input: {
  orderId: string;
  value: number;
  at: Date;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  email?: string | null;
  phone?: string | null;
  enhanced: boolean;
  currencyCode?: string;
  conversionAction?: string;
  conversionDateTime?: string;
}) {
  const conversion: Record<string, unknown> = {
    conversionAction: input.conversionAction || conversionActionName(),
    conversionDateTime: input.conversionDateTime || adsConversionDateTime(input.at),
    conversionValue: input.value,
    currencyCode: input.currencyCode || "INR",
    orderId: input.orderId,
  };
  if (input.gclid) conversion.gclid = input.gclid;
  else if (input.gbraid) conversion.gbraid = input.gbraid;
  else if (input.wbraid) conversion.wbraid = input.wbraid;
  else if (input.enhanced) {
    const userIdentifiers: Record<string, string>[] = [];
    if (input.email) userIdentifiers.push({ hashedEmail: sha256Norm(input.email) });
    if (input.phone) userIdentifiers.push({ hashedPhoneNumber: sha256Norm(input.phone.replace(/\D/g, "")) });
    if (!userIdentifiers.length) return null;
    conversion.userIdentifiers = userIdentifiers;
  } else {
    return null;
  }
  return {
    conversions: [conversion],
    partialFailure: true,
  };
}

export async function uploadPaidGoogleConversion(orderId: string) {
  if (!googleAdsUploadConfigured()) return { ok: false as const, skipped: "no_credentials" as const };
  const payment = await prisma.payment.findUnique({ where: { id: orderId } });
  if (!payment || payment.isTest) return { ok: false as const, skipped: "not_sale" as const };
  if (payment.status !== "paid" && payment.status !== "paid_unassigned") return { ok: false as const, skipped: "not_sale" as const };
  if (payment.gateway === "cashfree" && !payment.gatewayConfirmedAt) return { ok: false as const, skipped: "unconfirmed" as const };
  if (payment.gateway === "stripe" && !payment.gatewayConfirmedAt) return { ok: false as const, skipped: "unconfirmed" as const };
  if (payment.gateway !== "cashfree" && payment.gateway !== "razorpay" && payment.gateway !== "stripe") return { ok: false as const, skipped: "gateway" as const };
  if (payment.gateway === "stripe" && !usConversionActionName()) return { ok: false as const, skipped: "no_us_action" as const };

  const clicks = clickIdsFromPayment(payment);
  const enhanced = enhancedConversionsEnabled();
  const isUs = payment.gateway === "stripe";
  const payload = clickConversionPayload({
    orderId: payment.id,
    value: isUs ? (payment.amountUsdCents ?? 0) / 100 : payment.amountInr,
    at: payment.paidAt || payment.gatewayConfirmedAt || new Date(),
    gclid: clicks.gclid,
    gbraid: clicks.gbraid,
    wbraid: clicks.wbraid,
    email: payment.email,
    phone: payment.phone,
    enhanced,
    currencyCode: isUs ? "USD" : "INR",
    conversionAction: isUs ? usConversionActionName() || undefined : undefined,
    conversionDateTime: isUs ? adsConversionDateTimeUs(payment.paidAt || payment.gatewayConfirmedAt || new Date()) : undefined,
  });
  if (!payload) return { ok: false as const, skipped: "no_click_id" as const };

  const claimed = await prisma.payment.updateMany({
    where: { id: orderId, googleAdsUploadedAt: null },
    data: { googleAdsUploadedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false as const, skipped: "already" as const };

  try {
    const token = await accessToken();
    const isUs = payment.gateway === "stripe";
    const cid = isUs ? usCustomerId() : customerId();
    const response = await fetch(`https://googleads.googleapis.com/${API_VERSION}/customers/${cid}:uploadClickConversions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(),
        "login-customer-id": isUs ? usLoginCustomerId() : loginCustomerId(),
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string }; partialFailureError?: { message?: string } };
    if (!response.ok) {
      throw new Error(`Google Ads ${response.status}: ${body.error?.message || "upload failed"}`);
    }
    if (body.partialFailureError?.message) {
      throw new Error(`Google Ads partial failure: ${body.partialFailureError.message}`);
    }
    return { ok: true as const };
  } catch (error) {
    await prisma.payment.update({ where: { id: orderId }, data: { googleAdsUploadedAt: null } }).catch(() => undefined);
    console.error("google ads conversion", error);
    return { ok: false as const, skipped: "error" as const };
  }
}
