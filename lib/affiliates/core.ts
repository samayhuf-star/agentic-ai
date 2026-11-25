import { randomBytes, randomInt } from "node:crypto";
import { formatInr } from "@/lib/config";

export const REF_COOKIE = "aitm_ref";
export const REF_COOKIE_DAYS = 30;
export const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export function normalizeCode(input: unknown) {
  return String(input ?? "").trim().toUpperCase();
}

export function isValidCode(code: string) {
  return CODE_RE.test(code);
}

export function suggestCode(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return `${base.length >= 3 ? base : "AITM"}${randomInt(100, 1000)}`;
}

export function newPartnerToken() {
  return randomBytes(24).toString("base64url");
}

export type CommissionRule = { commissionType: string; rate: number };

export function commissionFor(rule: CommissionRule, saleInr: number) {
  if (rule.commissionType === "fixed") return Math.max(0, Math.round(rule.rate));
  return Math.max(0, Math.round((saleInr * rule.rate) / 100));
}

export function ruleLabel(rule: CommissionRule) {
  if (rule.commissionType === "fixed") return `${formatInr(rule.rate)} per sale`;
  return `${Number(rule.rate.toFixed(2))}% of sale`;
}

export const ID_RE = /^[a-z0-9]{10,40}$/;

/** Cookie value: CODE.clickId.unixSeconds.postId */
export function encodeRefCookie(code: string, clickId: string | null, postId: string | null = null) {
  return `${code}.${clickId || "-"}.${Math.floor(Date.now() / 1000)}.${postId || "-"}`;
}

export function decodeRefCookie(value: string | null | undefined) {
  if (!value) return null;
  const [code, clickId, ts, postId] = decodeURIComponent(value).split(".");
  const normalized = normalizeCode(code);
  if (!isValidCode(normalized)) return null;
  const at = Number(ts);
  if (!Number.isFinite(at) || Date.now() / 1000 - at > REF_COOKIE_DAYS * 86400) return null;
  return {
    code: normalized,
    clickId: clickId && ID_RE.test(clickId) ? clickId : null,
    postId: postId && ID_RE.test(postId) ? postId : null,
  };
}

export function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

export function maskEmail(email: string | null | undefined) {
  if (!email || !email.includes("@")) return "Customer";
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
}

export function partnerUrl(origin: string, token: string) {
  return `${origin}/partner/${token}`;
}

export function referralUrls(origin: string, code: string) {
  return { home: `${origin}/?ref=${code}`, offer: `${origin}/55-ai-agents?ref=${code}`, short: `${origin}/r/${code}` };
}

export function postUrl(origin: string, code: string, postId: string) {
  return `${origin}/55-ai-agents?ref=${code}&p=${postId}`;
}
