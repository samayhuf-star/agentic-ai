import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import * as v from "@/lib/admin/validate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const { id } = await params;
  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) return json({ message: "That affiliate was not found." }, 404);
  const body = await readJson(request);
  const action = String(body.action || "");
  try {
    if (action === "adjustment") {
      const raw = Number(String(body.amount ?? "").replace(/[,\s₹]/g, ""));
      if (!Number.isInteger(raw) || raw === 0 || Math.abs(raw) > 10_000_000) throw new v.InputError("Amount must be a whole number of rupees, not 0. Use a minus sign to deduct.");
      const note = v.text(body.note, "Reason", 500, true)!;
      const status = body.status === "approved" ? "approved" : "pending";
      const row = await prisma.affiliateCommission.create({
        data: {
          affiliateId: id,
          kind: "adjustment",
          amountInr: raw,
          status,
          note,
          createdBy: actor,
          ...(status === "approved" ? { approvedAt: new Date(), approvedBy: actor } : {}),
        },
      });
      await audit(actor, "commission.adjust", "affiliate", id, `Adjustment ₹${raw} for ${affiliate.name}: ${note}`, { commissionId: row.id });
      return json({ ok: true, message: "Adjustment added." }, 201);
    }
    if (action === "approveAll") {
      const { count } = await prisma.affiliateCommission.updateMany({
        where: { affiliateId: id, status: "pending" },
        data: { status: "approved", approvedAt: new Date(), approvedBy: actor },
      });
      await audit(actor, "commission.approveAll", "affiliate", id, `Approved ${count} pending commission entries for ${affiliate.name}`);
      return json({ ok: true, message: `Approved ${count}.` });
    }
    if (action === "payAll") {
      const payoutRef = v.text(body.payoutRef, "Payout reference", 120, true)!;
      const paidAt = v.date(body.paidAt, "Payout date") ?? new Date();
      const rows = await prisma.affiliateCommission.findMany({ where: { affiliateId: id, status: "approved" }, select: { id: true, amountInr: true } });
      if (rows.length === 0) throw new v.InputError("Nothing is approved yet. Approve entries first.");
      const total = rows.reduce((sum, row) => sum + row.amountInr, 0);
      await prisma.affiliateCommission.updateMany({
        where: { id: { in: rows.map((row) => row.id) } },
        data: { status: "paid", paidAt, paidBy: actor, payoutRef },
      });
      await audit(actor, "commission.payout", "affiliate", id, `Paid ₹${total} to ${affiliate.name} (${rows.length} entries, ref ${payoutRef})`, {
        ids: rows.map((row) => row.id),
        total,
        payoutRef,
        paidAt,
      });
      return json({ ok: true, message: `Marked ₹${total} paid.` });
    }
    throw new v.InputError("Unknown action.");
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not save." }, 500);
  }
}
