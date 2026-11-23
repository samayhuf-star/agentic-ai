import { NextResponse } from "next/server";
import { readJson } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions, verifyLoginCode } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  const result = await verifyLoginCode(String(body.email || ""), String(body.code || ""));
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  const response = NextResponse.json({ redirect: result.redirect });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(request));
  return response;
}
