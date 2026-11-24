import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PREVIEW_LAYOUT_COOKIE, PREVIEW_LAYOUT_HEADER, parsePreviewLayout } from "@/lib/preview-layout";

export function middleware(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("layout");
  const fromCookie = parsePreviewLayout(request.cookies.get(PREVIEW_LAYOUT_COOKIE)?.value);
  const picked = param === "default" || param === "off" ? null : parsePreviewLayout(param) || fromCookie;
  const headers = new Headers(request.headers);
  headers.set(PREVIEW_LAYOUT_HEADER, picked || "");
  const response = NextResponse.next({ request: { headers } });
  if (parsePreviewLayout(param)) {
    response.cookies.set(PREVIEW_LAYOUT_COOKIE, param as string, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else if (param === "default" || param === "off") {
    response.cookies.set(PREVIEW_LAYOUT_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return response;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/onboarding"],
};
