import { NextResponse } from "next/server";
import { logEvent } from "@/lib/activity/log";
import { appOrigin } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { payAgain } from "@/lib/payments/retry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function logRecoveryClick(request: Request, orderId: string) {
  const ua = request.headers.get("user-agent") || "unknown";
  const payment = await prisma.payment.findUnique({
    where: { id: orderId },
    select: { id: true, email: true, phone: true },
  }).catch(() => null);
  await logEvent({
    type: "recovery_link_clicked",
    email: payment?.email,
    phone: payment?.phone,
    paymentId: orderId,
    source: "recovery",
    status: request.method,
    summary: "Clicked recovery link",
    detail: `${request.method} · UA ${ua}`,
  });
}

async function handle(request: Request) {
  const url = new URL(request.url);
  let orderId = url.searchParams.get("order") || "";
  if (!orderId && request.method === "POST") {
    const form = await request.formData().catch(() => null);
    orderId = String(form?.get("order") || "");
  }
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(orderId)) return NextResponse.redirect(new URL("/checkout", appOrigin(request)), 303);
  await logRecoveryClick(request, orderId);
  try {
    const { redirect } = await payAgain(request, orderId);
    return NextResponse.redirect(redirect, 303);
  } catch (error) {
    console.error("pay again", error);
    return NextResponse.redirect(new URL(`/payment/success?order_id=${encodeURIComponent(orderId)}&retry=failed`, appOrigin(request)), 303);
  }
}

// GET so a link in an email works; POST from the button.
export const GET = handle;
export const POST = handle;
