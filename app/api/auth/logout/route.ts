import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE, tokenFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await destroySession(tokenFromRequest(request));
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
