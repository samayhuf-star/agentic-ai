import { NextResponse } from "next/server";
import { logEvent } from "@/lib/activity/log";
import {
  eventTypeFromWebhook,
  firstRecipient,
  journeyTitle,
  verifyResendSignature,
  webhookEventSummary,
  type ResendWebhookPayload,
} from "@/lib/messaging/resend-webhook";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function header(request: Request, name: string) {
  return request.headers.get(name) || request.headers.get(name.toLowerCase());
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET || "";
  if (!secret) return NextResponse.json({ error: "webhook secret not configured" }, { status: 503 });
  const body = await request.text();
  const ok = verifyResendSignature({
    body,
    id: header(request, "svix-id"),
    timestamp: header(request, "svix-timestamp"),
    signature: header(request, "svix-signature"),
    secret,
  });
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(body) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const type = eventTypeFromWebhook(payload.type);
  if (!type) return NextResponse.json({ ok: true, ignored: payload.type || "unknown" });

  const data = payload.data || {};
  const email = firstRecipient(data.to);
  const resendId = data.email_id || null;
  const at = payload.created_at ? new Date(payload.created_at) : new Date();
  const createdAt = Number.isNaN(at.getTime()) ? new Date() : at;
  const subject = data.subject || null;
  const url = data.click?.link || null;
  const userAgent = data.click?.userAgent || data.click?.user_agent || null;
  const detail = webhookEventSummary(payload, type);
  const dedupeKey = [resendId || "resend", type, payload.created_at || createdAt.toISOString()].join(":");

  let leadId: string | null = null;
  let paymentId: string | null = null;
  if (email) {
    const [lead, payment] = await Promise.all([
      prisma.lead.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, orderBy: { createdAt: "desc" }, select: { id: true, orderId: true } }),
      prisma.payment.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, orderBy: { createdAt: "desc" }, select: { id: true } }),
    ]);
    leadId = lead?.id || null;
    paymentId = lead?.orderId || payment?.id || null;
  }

  try {
    await prisma.emailEvent.create({
      data: {
        createdAt,
        type,
        email: email || "unknown",
        resendId,
        leadId,
        paymentId,
        subject,
        detail,
        userAgent,
        url,
        dedupeKey,
      },
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
    if (code !== "P2002") {
      console.error("resend webhook store failed", error);
      return NextResponse.json({ error: "store failed" }, { status: 500 });
    }
  }

  await logEvent({
    type,
    at: createdAt,
    email,
    paymentId,
    status: type.replace("email.", ""),
    summary: journeyTitle(type, subject),
    detail: [url, userAgent ? `UA ${userAgent}` : null, resendId ? `resend ${resendId}` : null].filter(Boolean).join(" · ") || detail,
    source: "resend",
    dedupeKey: `sys:${dedupeKey}`,
  });

  return NextResponse.json({ ok: true });
}
