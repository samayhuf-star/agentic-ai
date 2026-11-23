import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE, cookieDomain, tokenFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await destroySession(tokenFromRequest(request));
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const domain = cookieDomain(host);
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, ...(domain ? { domain } : {}) });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
