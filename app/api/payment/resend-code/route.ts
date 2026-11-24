import { json, readJson } from "@/lib/api";
import { isEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendFulfilmentCode, SIGN_IN_CODE_SUBJECT } from "@/lib/payments/sign-in-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  const orderId = String(body.orderId || "");
  const payment = orderId ? await prisma.payment.findUnique({ where: { id: orderId } }) : null;
  if (!payment || (payment.status !== "paid" && payment.status !== "paid_unassigned") || !payment.email || !isEmail(payment.email)) {
    return json({ message: "That payment is not ready for a code yet." }, 404);
  }
  const latest = await prisma.emailLog.findFirst({
    where: { toEmail: payment.email, subject: SIGN_IN_CODE_SUBJECT },
    orderBy: { createdAt: "desc" },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < 30_000) {
    return json({ message: "A code was just sent. Wait a few seconds, then try again." }, 429);
  }
  const mailed = await sendFulfilmentCode(payment.id, payment.email, "resend");
  if (!mailed.ok) return json({ message: mailed.message }, mailed.status);
  return json({ message: mailed.devCode ? `Your code is ${mailed.devCode}. Email is in test mode.` : mailed.message });
}
