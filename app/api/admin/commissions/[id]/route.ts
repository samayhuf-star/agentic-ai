import type { Prisma } from "@prisma/client";
import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import * as v from "@/lib/admin/validate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const { id } = await params;
  const row = await prisma.affiliateCommission.findUnique({ where: { id }, include: { affiliate: { select: { name: true } } } });
  if (!row) return json({ message: "That commission entry was not found." }, 404);
  const body = await readJson(request);
  const action = String(body.action || "");
  try {
    let data: Prisma.AffiliateCommissionUpdateInput;
    let summary: string;
    if (action === "approve") {
      if (row.status !== "pending") throw new v.InputError("Only pending entries can be approved.");
      data = { status: "approved", approvedAt: new Date(), approvedBy: actor };
      summary = "Approved";
    } else if (action === "pay") {
      if (row.status !== "approved" && row.status !== "pending") throw new v.InputError("Only pending or approved entries can be marked paid.");
      const payoutRef = v.text(body.payoutRef, "Payout reference", 120, true)!;
      data = {
        status: "paid",
        paidAt: v.date(body.paidAt, "Payout date") ?? new Date(),
        paidBy: actor,
        payoutRef,
        ...(row.approvedAt ? {} : { approvedAt: new Date(), approvedBy: actor }),
      };
      summary = `Marked paid (ref ${payoutRef})`;
    } else if (action === "void") {
      if (row.status === "void") throw new v.InputError("Already void.");
      if (row.status === "paid") throw new v.InputError("This was paid out. Add a negative adjustment instead.");
      data = { status: "void", voidReason: v.text(body.note, "Reason", 300) || "Voided by admin" };
      summary = "Voided";
    } else if (action === "reopen") {
      if (row.status !== "void") throw new v.InputError("Only void entries can be reopened.");
      if (row.kind === "sale" && row.paymentId) {
        const payment = await prisma.payment.findUnique({ where: { id: row.paymentId } });
        if (!payment || payment.status !== "paid" || payment.isTest) throw new v.InputError("The payment is not a real paid payment, so this cannot be reopened.");
      }
      data = { status: "pending", voidReason: null, approvedAt: null, approvedBy: null };
      summary = "Reopened";
    } else {
      throw new v.InputError("Unknown action.");
    }
    await prisma.affiliateCommission.update({ where: { id }, data });
    await audit(actor, `commission.${action}`, "affiliate", row.affiliateId, `${summary} ₹${row.amountInr} ${row.kind} for ${row.affiliate.name}`, {
      commissionId: id,
      paymentId: row.paymentId,
      from: row.status,
    });
    return json({ ok: true, message: `${summary}.` });
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not save." }, 500);
  }
}
