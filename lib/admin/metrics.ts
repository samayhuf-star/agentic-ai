import { privilegedEmails } from "@/lib/config";

const DISPOSABLE = new Set(["mailinator.com", "mailinator.co", "guerrillamail.com", "example.com", "example.org", "test.com"]);
const OWNER_EXTRAS = new Set(["samay@krosz.com"]);

/** Staff, owner aliases, QA and disposable inboxes — excluded from customer and revenue metrics. */
export function isInternalEmail(email: string | null | undefined): boolean {
  const value = (email || "").trim().toLowerCase();
  if (!value || !value.includes("@")) return false;
  if (privilegedEmails().includes(value) || OWNER_EXTRAS.has(value)) return true;
  const [local, domain] = value.split("@");
  if (!domain) return true;
  if (domain === "theaitimemachine.com" || domain.endsWith(".theaitimemachine.com")) return true;
  if (DISPOSABLE.has(domain)) return true;
  if (local === "qa-test" || local.startsWith("qa-test+") || local.includes("+aitm") || local.includes("aitmflow") || local.endsWith("+test")) return true;
  for (const admin of privilegedEmails()) {
    const [adminLocal, adminDomain] = admin.split("@");
    if (adminDomain && domain === adminDomain && adminLocal && local.startsWith(`${adminLocal}+`)) return true;
  }
  return false;
}

/** A row counted as a customer in the admin overview: not staff/test, and has an email. */
export function isMetricCustomer(email: string | null | undefined) {
  if (!email) return false;
  return !isInternalEmail(email);
}

export function confirmedSaleWhere() {
  return { status: "paid" as const, isTest: false, gateway: "cashfree", gatewayConfirmedAt: { not: null } };
}

export const PENDING_WINDOW_MS = 48 * 60 * 60 * 1000;
