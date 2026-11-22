import { NextResponse } from "next/server";
import { handleWebhook } from "@/lib/payments/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await context.params;
  const raw = await request.text();
  const result = await handleWebhook(gateway, raw, request.headers);
  return NextResponse.json(result.body, { status: result.status });
}
