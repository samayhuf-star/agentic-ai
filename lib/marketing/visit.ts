import { prisma } from "@/lib/prisma";
import { readCookie } from "@/lib/affiliates/core";
import { channelOf, decodeMarketing, isValidVisitorId, MT_COOKIE, newVisitorId, sourceOf, VID_COOKIE, type Touch } from "@/lib/marketing/touch";
import { logEvent } from "@/lib/activity/log";
import { deviceLabel, inAppKind } from "@/lib/device";

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
  if (recent) {
    await logInAppPrompt(request, path, source, `visit:${recent.id}`);
    return { visitorId, created: false, minted };
  }
  const visit = await prisma.marketingVisit.create({
    data: {
      visitorId,
      path: path.slice(0, 200),
      source,
      channel: channelOf(last),
      campaign: last?.c?.slice(0, 120) || null,
      mkt: last ? (last as object) : undefined,
    },
  });
  await logEvent({
    type: "visit",
    source,
    status: channelOf(last),
    summary: `Visited ${path} from ${source}`,
    detail: last?.c ? `Campaign ${last.c}` : null,
    dedupeKey: `visit:${visit.id}`,
  });
  await logInAppPrompt(request, path, source, `visit:${visit.id}`);
  return { visitorId, created: true, minted };
}

async function logInAppPrompt(request: Request, path: string, source: string, dedupe: string) {
  const ua = request.headers.get("user-agent");
  const kind = inAppKind(ua);
  if (!kind) return;
  await logEvent({
    type: "inapp_browser_prompt",
    source,
    status: kind,
    summary: `In-app browser prompt (${kind}) on ${path}`,
    detail: deviceLabel(ua),
    dedupeKey: `inapp_browser_prompt:${dedupe}`,
  });
}
