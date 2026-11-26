import { NextResponse } from "next/server";
import { logEvent } from "@/lib/activity/log";
import { readClaritySessionId } from "@/lib/marketing/clarity";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: unknown; orderId?: unknown; path?: unknown };
  const sessionId = readClaritySessionId(body.sessionId);
  if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 });
  const orderId = String(body.orderId || "").trim().slice(0, 64);
  const path = String(body.path || "").trim().slice(0, 200);
  if (orderId && /^br[a-z0-9]+$/i.test(orderId)) {
    const payment = await prisma.payment.findUnique({ where: { id: orderId }, select: { email: true, phone: true, isTest: true, amountInr: true, claritySessionId: true } });
    if (payment && !payment.claritySessionId) {
      await prisma.payment.update({ where: { id: orderId }, data: { claritySessionId: sessionId } });
    }
    await prisma.lead.updateMany({ where: { orderId, claritySessionId: null }, data: { claritySessionId: sessionId } });
    await logEvent({
      type: "clarity.session",
      email: payment?.email,
      phone: payment?.phone,
      paymentId: orderId,
      amountInr: payment?.amountInr,
      summary: `Clarity session ${sessionId} on ${path || "unknown page"}`,
      detail: sessionId,
      isTest: payment?.isTest,
      dedupeKey: `clarity.session:${orderId}:${sessionId}`,
    });
  } else {
    await logEvent({
      type: "clarity.session",
      summary: `Clarity session ${sessionId} on ${path || "unknown page"}`,
      detail: sessionId,
      dedupeKey: `clarity.session:${sessionId}:${path || "page"}`,
    });
  }
  return NextResponse.json({ ok: true });
}
