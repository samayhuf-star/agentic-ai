import { prisma } from "@/lib/prisma";
import { readCookie } from "@/lib/affiliates/core";
import { channelOf, decodeMarketing, isValidVisitorId, MT_COOKIE, newVisitorId, sourceOf, VID_COOKIE, type Touch } from "@/lib/marketing/touch";

const PRIVATE = /^\/(api\/|sup-admin|admin|partner\/|dashboard|onboarding|welcome|unsubscribe|_next\/)/;

export function visitorIdFromRequest(request: Request) {
  const existing = readCookie(request, VID_COOKIE);
  return isValidVisitorId(existing) ? existing : null;
}

export function shouldRecordPath(path: string) {
  return !PRIVATE.test(path);
}

/** Persist one landing so the admin Sources view can count unique visitors. */
export async function recordVisit(request: Request, path: string) {
  if (!shouldRecordPath(path)) {
    const visitorId = visitorIdFromRequest(request) || newVisitorId();
    return { visitorId, created: false, minted: !visitorIdFromRequest(request) };
  }
  const mk = decodeMarketing(readCookie(request, MT_COOKIE));
  const last: Touch | null = mk?.l || mk?.f || null;
  const source = sourceOf(last, { absent: "Direct" });
  let visitorId = visitorIdFromRequest(request);
  const minted = !visitorId;
  if (!visitorId) visitorId = newVisitorId();
  const recent = await prisma.marketingVisit.findFirst({
    where: { visitorId, path, createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
    select: { id: true },
  });
  if (recent) return { visitorId, created: false, minted };
  await prisma.marketingVisit.create({
    data: {
      visitorId,
      path: path.slice(0, 200),
      source,
      channel: channelOf(last),
      campaign: last?.c?.slice(0, 120) || null,
      mkt: last ? (last as object) : undefined,
    },
  });
  return { visitorId, created: true, minted };
}
