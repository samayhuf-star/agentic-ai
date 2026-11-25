import { isEmail } from "@/lib/auth";
import { indianMobile } from "@/lib/phone";

export const PAYMENT_STATUSES = ["paid", "pending", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_METHODS = ["upi", "bank_transfer", "cash", "card", "cashfree", "razorpay", "payu", "other"] as const;
export const METHOD_LABEL: Record<string, string> = {
  upi: "UPI",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  card: "Card",
  cashfree: "Cashfree",
  razorpay: "Razorpay",
  payu: "PayU",
  other: "Other",
};

export class InputError extends Error {}

export function text(value: unknown, label: string, max: number, required = false) {
  const out = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (required && !out) throw new InputError(`${label} is required.`);
  if (out.length > max) throw new InputError(`${label} must be ${max} characters or fewer.`);
  return out || null;
}

export function email(value: unknown, required = true) {
  const out = (typeof value === "string" ? value : "").trim().toLowerCase();
  if (!out) {
    if (required) throw new InputError("Email is required.");
    return null;
  }
  if (out.length > 200 || !isEmail(out)) throw new InputError("Enter a valid email.");
  return out;
}

export function phone(value: unknown) {
  const raw = (typeof value === "string" ? value : "").trim();
  if (!raw) return null;
  const mobile = indianMobile(raw);
  if (!mobile.ok) throw new InputError(mobile.error);
  return mobile.e164;
}

export function amount(value: unknown) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[,\s₹]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000 || !Number.isInteger(n)) {
    throw new InputError("Amount must be a whole number of rupees between 0 and 1,00,00,000.");
  }
  return n;
}

export function paymentStatus(value: unknown): PaymentStatus {
  const out = String(value || "");
  if (!(PAYMENT_STATUSES as readonly string[]).includes(out)) throw new InputError("Pick a valid status.");
  return out as PaymentStatus;
}

export function paymentMethod(value: unknown) {
  const out = String(value || "");
  if (!(PAYMENT_METHODS as readonly string[]).includes(out)) throw new InputError("Pick a valid method.");
  return out;
}

export function date(value: unknown, label: string) {
  let raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  // datetime-local inputs carry no zone; the business runs on IST.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) raw = `${raw}+05:30`;
  else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) raw = `${raw}T00:00:00+05:30`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new InputError(`${label} is not a valid date.`);
  if (parsed.getFullYear() < 2020 || parsed.getTime() > Date.now() + 366 * 24 * 3600 * 1000) {
    throw new InputError(`${label} is out of range.`);
  }
  return parsed;
}

export function bool(value: unknown) {
  return value === true || value === "true" || value === "on" || value === 1;
}
