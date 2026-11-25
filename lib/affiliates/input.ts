import type { Prisma } from "@prisma/client";
import * as v from "@/lib/admin/validate";
import { isValidCode, normalizeCode } from "@/lib/affiliates/core";
import { serializeHidden } from "@/lib/affiliates/dashboard";
import { socialUrl } from "@/lib/affiliates/social";

/** Default terms for new applicants. Admin can change per creator before or after approval. */
export const DEFAULT_RULE = { commissionType: "percent", rate: 20 } as const;

export const STATUSES = ["pending", "active", "paused", "rejected"] as const;

export function followers(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase().replace(/[,\s]/g, "");
  if (!raw) return null;
  const m = raw.match(/^(\d+(?:\.\d+)?)(k|m|l|lakh)?$/);
  if (!m) throw new v.InputError("Followers should be a number, like 12000 or 12k.");
  const mult = m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : m[2] ? 1e5 : 1;
  const n = Math.round(Number(m[1]) * mult);
  if (n > 1_000_000_000) throw new v.InputError("Followers number is too big.");
  return n;
}

export function readAffiliate(body: Record<string, unknown>, partial: boolean) {
  const data: Prisma.AffiliateUncheckedUpdateInput = {};
  const has = (key: string) => !partial || key in body;
  if (has("name")) data.name = v.text(body.name, "Name", 80, true)!;
  if (has("email")) data.email = v.email(body.email, false);
  if (has("phone")) data.phone = v.phone(body.phone);
  if (has("handles")) data.handles = v.text(body.handles, "Platforms / handles", 1000);
  if (has("code") && (body.code !== undefined || !partial)) {
    const code = normalizeCode(body.code);
    if (code && !isValidCode(code)) throw new v.InputError("Code must be 3–32 letters, numbers, - or _, starting with a letter or number.");
    if (code) data.code = code;
  }
  if (has("commissionType")) {
    const type = String(body.commissionType || "");
    if (type !== "percent" && type !== "fixed") throw new v.InputError("Pick percent of sale or fixed ₹ per sale.");
    data.commissionType = type;
  }
  if (has("rate")) {
    const rate = Number(String(body.rate ?? "").replace(/[,\s₹%]/g, ""));
    const type = data.commissionType ?? body.commissionType;
    if (!Number.isFinite(rate) || rate < 0) throw new v.InputError("Rate must be a positive number.");
    if (type === "percent" && rate > 100) throw new v.InputError("A percent rate cannot be over 100.");
    if (type === "fixed" && (rate > 1_000_000 || !Number.isInteger(rate))) throw new v.InputError("A fixed rate must be whole rupees.");
    data.rate = Math.round(rate * 100) / 100;
  }
  if (has("status")) {
    const status = String(body.status || "active");
    if (!(STATUSES as readonly string[]).includes(status)) throw new v.InputError("Status must be pending, active, paused or rejected.");
    data.status = status;
  }
  if (has("payoutNotes")) data.payoutNotes = v.text(body.payoutNotes, "Payout details", 1000);
  if (has("notes")) data.notes = v.text(body.notes, "Notes", 2000);
  if (has("city")) data.city = v.text(body.city, "City", 60);
  if (has("instagramUrl")) data.instagramUrl = socialUrl(body.instagramUrl, "Instagram link", ["instagram"]);
  if (has("tiktokUrl")) data.tiktokUrl = socialUrl(body.tiktokUrl, "TikTok link", ["tiktok"]);
  if (has("followers")) data.followers = followers(body.followers);
  if (has("niche")) data.niche = v.text(body.niche, "Niche", 80);
  if (has("pitch")) data.pitch = v.text(body.pitch, "Content plan", 2000);
  if ("hiddenBlocks" in body) data.hiddenBlocks = serializeHidden(body.hiddenBlocks);
  return data;
}
