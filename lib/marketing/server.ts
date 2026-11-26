import type { Prisma } from "@prisma/client";
import { readCookie } from "@/lib/affiliates/core";
import { clientIp } from "@/lib/rate-limit";
import { channelOf, decodeMarketing, MT_COOKIE, sourceOf, type Touch } from "@/lib/marketing/touch";
import { prisma } from "@/lib/prisma";
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
  add("gbraid", t.gb);
  add("wbraid", t.w);
  add("fbclid", t.f);
  add("ttclid", t.k);
  add("li_fat_id", t.l);
  add("Source label", sourceOf(t));
  if (t.at) rows.push(["Seen", new Date(t.at * 1000).toISOString()]);
  return rows;
}


/** Copy first/last touch from the visitor cookie onto a signed-in or newly created user. */
export async function applyMarketingToUser(userId: string, request: Request, affiliateId: string | null = null) {
  const fields = marketingFromRequest(request, affiliateId);
  if (!fields.mktFirst && !fields.mktLast) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mktFirst: true } });
  if (!user) return;
  // stamp() also returns gclid for Payment rows. User has no gclid column, so only copy user fields.
  const data = {
    mktFirst: fields.mktFirst,
    mktLast: fields.mktLast,
    channelFirst: fields.channelFirst,
    channelLast: fields.channelLast,
  };
  if (user.mktFirst) {
    await prisma.user.update({
      where: { id: userId },
      data: { mktLast: data.mktLast, channelLast: data.channelLast },
    });
    return;
  }
  await prisma.user.update({ where: { id: userId }, data });
}
