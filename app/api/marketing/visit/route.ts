import { NextResponse } from "next/server";
import { clientIp, hitLimit } from "@/lib/rate-limit";
import { encodeMarketing, isValidVisitorId, marketingCookieOptions, MT_COOKIE, newVisitorId, VID_COOKIE, VID_DAYS } from "@/lib/marketing/touch";
import { marketingFromVisit, recordVisit } from "@/lib/marketing/visit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await hitLimit(`visit:${ip}`, 40, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: true }, { status: 204 });
  const body = (await request.json().catch(() => ({}))) as { path?: string };
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 400) : "/";
  const derived = marketingFromVisit(request, path);
  const result = await recordVisit(request, path, derived.cookie);
  const response = NextResponse.json({ ok: true });
  const proto = request.headers.get("x-forwarded-proto") || "";
  const host = (request.headers.get("x-forwarded-host") || new URL(request.url).hostname).split(",")[0].trim();
  const secure = proto === "https";
  if (derived.cookie) {
    response.cookies.set(MT_COOKIE, encodeMarketing(derived.cookie), marketingCookieOptions(host, secure));
  }
  if (result.minted && isValidVisitorId(result.visitorId)) {
    response.cookies.set(VID_COOKIE, result.visitorId, marketingCookieOptions(host, secure, VID_DAYS * 86400));
  } else if (!isValidVisitorId(result.visitorId)) {
    const visitorId = newVisitorId();
    response.cookies.set(VID_COOKIE, visitorId, marketingCookieOptions(host, secure, VID_DAYS * 86400));
  }
  return response;
}
