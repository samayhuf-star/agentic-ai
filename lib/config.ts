export type PublicConfig = {
  priceInrLabel: string;
  priceUsdLabel: string;
  compareInrLabel: string;
  compareUsdLabel: string;
  offerEnds: string;
  checkoutPath: string;
};

function numberFrom(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function formatInr(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatUsd(amount: number) {
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function pricing() {
  const inr = numberFrom(process.env.PRICE_INR, 1999);
  const usd = numberFrom(process.env.PRICE_USD, 24);
  const compareInr = numberFrom(process.env.COMPARE_PRICE_INR, 4999);
  const compareUsd = numberFrom(process.env.COMPARE_PRICE_USD, 60);
  return { inr, usd, compareInr, compareUsd };
}

export function publicConfig(): PublicConfig {
  const price = pricing();
  return {
    priceInrLabel: formatInr(price.inr),
    priceUsdLabel: formatUsd(price.usd),
    compareInrLabel: formatInr(price.compareInr),
    compareUsdLabel: formatUsd(price.compareUsd),
    offerEnds: process.env.LAUNCH_OFFER_ENDS || "2026-12-31T23:59:59+05:30",
    checkoutPath: "/api/checkout",
  };
}

export function appOrigin(request?: Request) {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function mockPaymentsAllowed() {
  if (process.env.ALLOW_MOCK_PAYMENTS === "true") return true;
  if (process.env.ALLOW_MOCK_PAYMENTS === "false") return false;
  return !isProduction();
}

export function authSecret() {
  return process.env.AUTH_SECRET || (isProduction() ? "" : "dev-auth-secret");
}

export function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.trim().toLowerCase());
}
