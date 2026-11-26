import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkHealth();
  return NextResponse.json({ ok: health.ok, db: health.db, ms: health.ms, checkedAt: health.checkedAt }, { status: health.ok ? 200 : 503 });
}
