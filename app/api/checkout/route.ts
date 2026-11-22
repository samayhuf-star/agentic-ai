import { NextResponse } from "next/server";
import { createCheckout } from "@/lib/payments/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function respond(request: Request) {
  const result = await createCheckout(request);
  if (result.redirect) return NextResponse.redirect(result.redirect, 303);
  return NextResponse.json({ message: result.message }, { status: result.status });
}

export function GET(request: Request) {
  return respond(request);
}

export function POST(request: Request) {
  return respond(request);
}
