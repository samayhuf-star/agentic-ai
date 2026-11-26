/** US market settings for /us. India pricing and the Cashfree checkout are unchanged. */

export const US_PRICE_CENTS_DEFAULT = 4999;

function numberFrom(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function usPriceCents() {
  return numberFrom(process.env.US_PRICE_CENTS, US_PRICE_CENTS_DEFAULT);
}

export function formatUsdCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function usPriceLabel() {
  return formatUsdCents(usPriceCents());
}

/** Exact US footer address. Hidden until Samay sets US_FOOTER_ADDRESS. Never invent one. */
export function usFooterAddress() {
  const value = (process.env.US_FOOTER_ADDRESS || "").trim();
  return value || null;
}

export function stripeSecretConfigured() {
  return Boolean((process.env.STRIPE_SECRET_KEY || "").trim());
}

export function stripeWebhookConfigured() {
  return Boolean((process.env.STRIPE_WEBHOOK_SECRET || "").trim());
}

export function stripePriceId() {
  return (process.env.STRIPE_PRICE_ID || "").trim() || null;
}

export function missingStripeEnv() {
  const missing: string[] = [];
  if (!stripeSecretConfigured()) missing.push("STRIPE_SECRET_KEY");
  if (!stripeWebhookConfigured()) missing.push("STRIPE_WEBHOOK_SECRET");
  return missing;
}

export const US_CHECKOUT_PATH = "/us/checkout";
export const US_LANDING_PATH = "/us";
export const US_AGENTS_PATH = "/us/55-ai-agents";
