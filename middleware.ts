import { NextResponse, type NextRequest } from "next/server";

const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/;

// ?ref=CODE on any public page goes through /r/CODE, which logs the click,
// sets the 30-day attribution cookie and sends the visitor back to the same page without ?ref.
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

export function middleware(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref) return NextResponse.next();
  const clean = publicUrl(request);
  const post = clean.searchParams.get("p");
  clean.searchParams.delete("ref");
  clean.searchParams.delete("p");
  if (!CODE_RE.test(ref)) return NextResponse.redirect(clean, 307);
  const to = `${clean.pathname}${clean.search}`;
  const target = publicUrl(request);
  target.pathname = `/r/${encodeURIComponent(ref)}`;
  target.search = `?to=${encodeURIComponent(to)}${post && /^[a-z0-9]{10,40}$/.test(post) ? `&p=${post}` : ""}`;
  return NextResponse.redirect(target, 307);
}

export const config = {
  matcher: ["/((?!api/|_next/|r/|partner/|sup-admin|dashboard|favicon|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};
