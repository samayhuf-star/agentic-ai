import { NextResponse } from "next/server";
import { logEvent } from "@/lib/activity/log";
import { isClarityPath } from "@/lib/marketing/clarity";

export const runtime = "nodejs";

const TYPES = new Set(["cta_click", "form_start", "form_step"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { type?: unknown; path?: unknown; href?: unknown; orderId?: unknown; field?: unknown };
  const type = String(body.type || "");
  if (!TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 400 });
  const path = String(body.path || "").trim().slice(0, 200);
  if (path && !isClarityPath(path) && type !== "cta_click") return NextResponse.json({ ok: true });
  const href = String(body.href || "").trim().slice(0, 200);
  const orderId = String(body.orderId || "").trim().slice(0, 64);
  const field = String(body.field || "").trim().slice(0, 40);
  const title =
    type === "cta_click"
      ? `CTA click${href ? ` to ${href}` : ""} on ${path || "page"}`
      : type === "form_start"
        ? `Checkout form started on ${path || "checkout"}`
        : `Checkout form step${field ? `: ${field}` : ""}`;
  await logEvent({
    type,
    paymentId: /^br[a-z0-9]+$/i.test(orderId) ? orderId : null,
    summary: title,
    detail: href || field || null,
    dedupeKey: `${type}:${path || ""}:${href || field || ""}:${orderId || "anon"}:${new Date().toISOString().slice(0, 16)}`,
  });
  return NextResponse.json({ ok: true });
}
