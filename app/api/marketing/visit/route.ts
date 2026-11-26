import { NextResponse } from "next/server";
import { clientIp, hitLimit } from "@/lib/rate-limit";
import { isValidVisitorId, newVisitorId, VID_COOKIE, VID_DAYS } from "@/lib/marketing/touch";
import { recordVisit } from "@/lib/marketing/visit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await hitLimit(`visit:${ip}`, 40, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: true }, { status: 204 });
  const body = (await request.json().catch(() => ({}))) as { path?: string };
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : "/";
  const result = await recordVisit(request, path);
  const response = NextResponse.json({ ok: true });
  if (result.minted && isValidVisitorId(result.visitorId)) {
    const proto = request.headers.get("x-forwarded-proto") || "";
    const host = (request.headers.get("x-forwarded-host") || new URL(request.url).hostname).split(",")[0].trim();
    response.cookies.set(VID_COOKIE, result.visitorId, {
      path: "/",
      maxAge: VID_DAYS * 86400,
      sameSite: "lax",
      httpOnly: true,
      secure: proto === "https",
      ...(host.endsWith("theaitimemachine.com") ? { domain: ".theaitimemachine.com" } : {}),
    });
  }
  return response;
}
