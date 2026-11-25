import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/config";
import { createCheckout } from "@/lib/payments/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return NextResponse.redirect(new URL("/checkout", appOrigin(request)), 303);
}

export async function POST(request: Request) {
  const result = await createCheckout(request);
  const wantsJson = (request.headers.get("content-type") || "").includes("application/json");
  if (result.redirect && wantsJson) {
    const orderId = "orderId" in result ? result.orderId : undefined;
    return NextResponse.json({ redirect: result.redirect, leadEventId: orderId ? `lead_${orderId}` : undefined });
  }
  if (result.redirect) return NextResponse.redirect(result.redirect, 303);
  return NextResponse.json({ message: result.message, field: "field" in result ? result.field : undefined }, { status: result.status });
}
