import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/config";
import { createUsCheckout } from "@/lib/payments/us-checkout";
import { US_CHECKOUT_PATH } from "@/lib/us";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL(US_CHECKOUT_PATH, appOrigin(request)), 303);
}

export async function POST(request: Request) {
  const result = await createUsCheckout(request);
  if (result.redirect) {
    const accept = request.headers.get("accept") || "";
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json") || accept.includes("application/json")) {
      return NextResponse.json({ redirect: result.redirect, orderId: "orderId" in result ? result.orderId : undefined }, { status: 200 });
    }
    return NextResponse.redirect(result.redirect, 303);
  }
  return NextResponse.json({ message: result.message, field: "field" in result ? result.field : undefined }, { status: result.status });
}
