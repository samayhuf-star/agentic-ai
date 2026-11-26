import { json } from "@/lib/api";
import { randomToken } from "@/lib/crypto";
import { sendRecoveryTest } from "@/lib/followups/recovery";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_TO = "samayhuf+recovery@gmail.com";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  const header = request.headers.get("x-cron-secret") || "";
  if (!secret || header !== secret) return json({ message: "Not allowed." }, 401);
  const body = (await request.json().catch(() => ({}))) as { to?: string; orderId?: string };
  const to = String(body.to || TEST_TO).trim().toLowerCase();
  if (to !== TEST_TO) return json({ message: "That test address is not allowed." }, 400);

  let orderId = String(body.orderId || "").trim();
  if (!orderId) {
    orderId = `brtest${randomToken().slice(0, 12)}`;
    await prisma.payment.create({
      data: {
        id: orderId,
        gateway: "cashfree",
        amountInr: 1999,
        status: "pending",
        email: to,
        name: "Recovery Test",
        isTest: true,
        adminNote: "One-off recovery email test",
      },
    });
  }
  const ids = await sendRecoveryTest(orderId, to, ["r1"]);
  return json({ ok: true, orderId, to, resendId: ids.r1 || null });
}
