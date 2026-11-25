import type { Prisma } from "@prisma/client";
import { readCookie } from "@/lib/affiliates/core";
import { clientIp } from "@/lib/rate-limit";
import { channelOf, decodeMarketing, MT_COOKIE, type Touch } from "@/lib/marketing/touch";
import { metaCapiEnabled } from "@/lib/marketing/meta";

export type StoredTouch = Touch & { _fbp?: string; _fbc?: string; _ua?: string; _ip?: string };

/** Marketing fields for a new checkout payment, from the visitor's first-party cookie. */
export function marketingFromRequest(request: Request, affiliateId: string | null) {
  const mk = decodeMarketing(readCookie(request, MT_COOKIE));
  const first: StoredTouch | null = mk?.f || null;
  const last: StoredTouch | null = mk?.l ? { ...mk.l } : null;
  if (metaCapiEnabled()) {
    const extra: StoredTouch = last || { at: Math.floor(Date.now() / 1000) };
    const fbp = readCookie(request, "_fbp");
    const fbc = readCookie(request, "_fbc") || (extra.f ? `fb.1.${extra.at * 1000}.${extra.f}` : null);
    if (fbp) extra._fbp = fbp.slice(0, 120);
    if (fbc) extra._fbc = fbc.slice(0, 300);
    extra._ua = (request.headers.get("user-agent") || "").slice(0, 300) || undefined;
    extra._ip = clientIp(request).slice(0, 64);
    return stamp(first, extra, affiliateId);
  }
  return stamp(first, last, affiliateId);
}

export function stamp(first: StoredTouch | null, last: StoredTouch | null, affiliateId: string | null) {
  return {
    mktFirst: (first ?? undefined) as Prisma.InputJsonValue | undefined,
    mktLast: (last ?? undefined) as Prisma.InputJsonValue | undefined,
    channelFirst: channelOf(first),
    channelLast: channelOf(last, { affiliate: Boolean(affiliateId) }),
    gclid: last?.g || first?.g || null,
  };
}

/** Public view of a stored touch (drops the CAPI-only keys). */
export function describeTouch(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as StoredTouch;
  const rows: [string, string][] = [];
  const add = (label: string, v?: string) => v && rows.push([label, v]);
  add("Source", t.s);
  add("Medium", t.m);
  add("Campaign", t.c);
  add("Term", t.t);
  add("Content", t.n);
  add("Landing", t.p);
  add("Referrer", t.r);
  add("Affiliate code", t.a);
  add("gclid", t.g);
  add("fbclid", t.f);
  add("ttclid", t.k);
  if (t.at) rows.push(["Seen", new Date(t.at * 1000).toISOString()]);
  return rows;
}
