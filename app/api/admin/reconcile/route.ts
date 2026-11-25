import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import { confirmPendingCashfreeOrder } from "@/lib/payments/confirm";
import { fetchCashfreeOrder } from "@/lib/payments/cashfree-order";
import { markCashfreeConfirmed } from "@/lib/payments/confirmed";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Re-check one order with Cashfree and apply Cashfree's answer (never marks paid without a PAID answer). */
export async function POST(request: Request) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const body = await readJson(request);
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!/^[A-Za-z0-9_-]{3,60}$/.test(orderId)) return json({ message: "Bad order id." }, 400);
  const before = await prisma.payment.findUnique({ where: { id: orderId }, select: { status: true, gatewayConfirmedAt: true, gateway: true } });
  if (!before) return json({ message: "We have no record of this order, so there's nothing to update. Check it in the Cashfree dashboard." }, 404);
  if (before.gateway !== "cashfree") return json({ message: "Not a Cashfree order." }, 400);
  let after = await confirmPendingCashfreeOrder(orderId);
  if (after && after.status === "paid" && !after.gatewayConfirmedAt) {
    const cf = await fetchCashfreeOrder(orderId);
    if (String(cf?.order_status || "").toUpperCase() === "PAID") {
      await markCashfreeConfirmed(orderId, "api");
      after = await prisma.payment.findUnique({ where: { id: orderId } });
    }
  }
  await audit(gate.session.email, "payment.recheck", "payment", orderId, `Re-checked with Cashfree: ${before.status} → ${after?.status}`, {
    before: before.status,
    after: after?.status,
    confirmed: Boolean(after?.gatewayConfirmedAt),
  });
  return json({ ok: true, message: `Now ${after?.status}${after?.gatewayConfirmedAt ? ", Cashfree-confirmed" : ""}.` });
}
