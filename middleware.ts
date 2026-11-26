import { NextResponse, type NextRequest } from "next/server";
import { decodeMarketing, encodeMarketing, isValidVisitorId, mergeTouch, MT_COOKIE, MT_DAYS, newVisitorId, touchFromRequest, VID_COOKIE, VID_DAYS } from "@/lib/marketing/touch";

const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/;

function publicUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (host) {
    url.host = host;
    url.port = "";
  }
  if (proto === "https" || proto === "http") url.protocol = `${proto}:`;
  return url;
}

/** First-party first/last-touch cookie (90 days) plus a durable visitor id for Sources. */
function withMarketing(request: NextRequest, response: NextResponse) {
  const host = publicUrl(request).hostname;
  const secure = request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:";
  const cookieBase = {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure,
    ...(host.endsWith("theaitimemachine.com") ? { domain: ".theaitimemachine.com" } : {}),
  };
  const prevVid = request.cookies.get(VID_COOKIE)?.value;
  const visitorId = isValidVisitorId(prevVid) ? prevVid : newVisitorId();
  if (prevVid !== visitorId) {
    response.cookies.set(VID_COOKIE, visitorId, { ...cookieBase, maxAge: VID_DAYS * 86400 });
  }
  const prev = decodeMarketing(request.cookies.get(MT_COOKIE)?.value);
  const own = [request.nextUrl.hostname, request.headers.get("x-forwarded-host")?.split(",")[0].trim() || "", "theaitimemachine.com", "www.theaitimemachine.com"].filter(Boolean);
  const touch = touchFromRequest(request.nextUrl, request.headers.get("referer"), own);
  const next = mergeTouch(prev, touch, request.nextUrl.pathname);
  if (next) {
    response.cookies.set(MT_COOKIE, encodeMarketing(next), { ...cookieBase, maxAge: MT_DAYS * 86400 });
  }
  return response;
}

// ?ref=CODE on any public page goes through /r/CODE, which logs the click,
// sets the 30-day affiliate cookie and sends the visitor back to the same page without ?ref.
export function middleware(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref) return withMarketing(request, NextResponse.next());
  const clean = publicUrl(request);
  const post = clean.searchParams.get("p");
  clean.searchParams.delete("ref");
  clean.searchParams.delete("p");
  if (!CODE_RE.test(ref)) return withMarketing(request, NextResponse.redirect(clean, 307));
  const to = `${clean.pathname}${clean.search}`;
  const target = publicUrl(request);
  target.pathname = `/r/${encodeURIComponent(ref)}`;
  target.search = `?to=${encodeURIComponent(to)}${post && /^[a-z0-9]{10,40}$/.test(post) ? `&p=${post}` : ""}`;
  return withMarketing(request, NextResponse.redirect(target, 307));
}

export const config = {
  matcher: ["/((?!api/|_next/|r/|partner/|sup-admin|dashboard|favicon|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};
