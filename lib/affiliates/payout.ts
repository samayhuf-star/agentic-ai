import { InputError } from "@/lib/admin/validate";
import { decryptSecret, encryptSecret } from "@/lib/encryption";

export type PayoutDetails = {
  upiId: string | null;
  holderName: string;
  bankAccount: string | null;
  bankIfsc: string | null;
  bankName: string | null;
};

const UPI_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Reads the payout form. Confirm fields must match. Returns null when nothing was entered and optional. */
export function readPayout(body: Record<string, unknown>, { optional = false } = {}): PayoutDetails | null {
  const upi = str(body.upiId);
  const upi2 = str(body.upiIdConfirm);
  const holder = str(body.holderName).replace(/\s+/g, " ");
  const acct = str(body.bankAccount).replace(/[\s-]/g, "");
  const acct2 = str(body.bankAccountConfirm).replace(/[\s-]/g, "");
  const ifsc = str(body.bankIfsc).toUpperCase();
  const bankName = str(body.bankName).replace(/\s+/g, " ");
  if (optional && !upi && !upi2 && !holder && !acct && !acct2 && !ifsc && !bankName) return null;

  if (!upi && !acct) throw new InputError("Add a UPI ID or bank account for payouts.");
  if (upi || upi2) {
    if (!UPI_RE.test(upi)) throw new InputError("UPI ID looks wrong. It should look like name@bank.");
    if (upi.toLowerCase() !== upi2.toLowerCase()) throw new InputError("The two UPI IDs do not match.");
  }
  if (!holder || holder.length < 2 || holder.length > 80) throw new InputError("Add the account holder name.");
  if (acct || acct2 || ifsc || bankName) {
    if (!/^\d{9,18}$/.test(acct)) throw new InputError("Account number should be 9 to 18 digits.");
    if (acct !== acct2) throw new InputError("The two account numbers do not match.");
    if (!IFSC_RE.test(ifsc)) throw new InputError("IFSC looks wrong. It is 11 characters, like HDFC0001234.");
    if (bankName.length > 80) throw new InputError("Bank name is too long.");
  }
  return {
    upiId: upi ? upi.toLowerCase() : null,
    holderName: holder,
    bankAccount: acct || null,
    bankIfsc: acct ? ifsc : null,
    bankName: acct ? bankName || null : null,
  };
}

export function maskUpi(upi: string) {
  const [user, bank] = upi.split("@");
  return `${user.slice(0, 3)}***@${bank}`;
}

export function maskAccount(acct: string) {
  return `****${acct.slice(-4)}`;
}

export function maskedSummary(d: PayoutDetails) {
  const parts: string[] = [];
  if (d.upiId) parts.push(`UPI ${maskUpi(d.upiId)}`);
  if (d.bankAccount) parts.push(`${d.bankName ? `${d.bankName} ` : ""}A/c ${maskAccount(d.bankAccount)}${d.bankIfsc ? ` (${d.bankIfsc.slice(0, 4)})` : ""}`);
  const holder = d.holderName.split(" ")[0];
  return `${parts.join(" · ")} — ${holder}`;
}

export function sealPayout(d: PayoutDetails) {
  const e = encryptSecret(JSON.stringify(d));
  return `v1.${e.iv}.${e.authTag}.${e.encryptedKey}`;
}

/** Server-only. Admin pages call this to show full details for paying. */
export function openPayout(sealed: string | null | undefined): PayoutDetails | null {
  if (!sealed) return null;
  const [v, iv, authTag, encryptedKey] = sealed.split(".");
  if (v !== "v1" || !iv || !authTag || !encryptedKey) return null;
  try {
    return JSON.parse(decryptSecret({ iv, authTag, encryptedKey })) as PayoutDetails;
  } catch {
    return null;
  }
}
