import type { Prisma } from "@prisma/client";
import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import * as v from "@/lib/admin/validate";
import { prisma } from "@/lib/prisma";
import { syncCommission } from "@/lib/affiliates/commission";
import { affiliateIdFromCode } from "@/lib/affiliates/lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return json({ message: "That payment was not found." }, 404);
  const manual = payment.gateway === "manual";
  const body = await readJson(request);
  try {
    const data: Prisma.PaymentUncheckedUpdateInput = {};
    if ("status" in body) {
      const status = v.paymentStatus(body.status);
      data.status = status;
      if (status === "paid") {
        data.paidAt = payment.paidAt ?? new Date();
        data.refundedAt = null;
        data.refundedBy = null;
      } else if (status === "refunded") {
        data.refundedAt = payment.refundedAt ?? new Date();
        data.refundedBy = payment.refundedBy ?? actor;
      } else {
        data.refundedAt = null;
        data.refundedBy = null;
      }
    }
    if ("amount" in body) {
      const amountInr = v.amount(body.amount);
      if (!manual && amountInr !== payment.amountInr) throw new v.InputError("Only manual payments can change amount. Gateway amounts come from the gateway.");
      data.amountInr = amountInr;
    }
    if ("method" in body) data.method = body.method ? v.paymentMethod(body.method) : null;
    if ("reference" in body) data.reference = v.text(body.reference, "Reference", 120);
    if ("note" in body) data.adminNote = v.text(body.note, "Note", 1000);
    if ("isTest" in body) data.isTest = v.bool(body.isTest);
    if ("paidAt" in body && body.paidAt) data.paidAt = v.date(body.paidAt, "Payment date");
    if ("customerEmail" in body) {
      const email = v.email(body.customerEmail, false);
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new v.InputError("No customer has that email.");
        data.userId = user.id;
        if (!payment.email) data.email = email;
      }
    }
    if ("affiliateCode" in body) {
      const affiliateId = await affiliateIdFromCode(body.affiliateCode);
      if (affiliateId !== payment.affiliateId) {
        const paidOut = await prisma.affiliateCommission.findFirst({ where: { key: `sale:${id}`, status: "paid" } });
        if (paidOut) throw new v.InputError("Commission for this payment was already paid out, so the affiliate cannot change.");
        data.affiliateId = affiliateId;
      }
    }
    await prisma.payment.update({ where: { id }, data });
    await syncCommission(id);
    const changed = Object.keys(data);
    await audit(actor, "payment.update", "payment", id, `Edited payment ${id}: ${changed.join(", ") || "nothing"}`, {
      before: Object.fromEntries(changed.map((key) => [key, (payment as Record<string, unknown>)[key]])),
      after: data,
    });
    return json({ ok: true, message: "Saved." });
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not save." }, 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return json({ message: "That payment was not found." }, 404);
  const body = await readJson(request);
  if (String(body.confirm || "").trim() !== id) return json({ message: "Type the payment ID to confirm." }, 400);
  if (payment.gateway !== "manual" && !payment.isTest) {
    return json({ message: "Real gateway payments are kept for the books. Change the status (for example to refunded or failed) instead." }, 400);
  }
  await prisma.payment.delete({ where: { id } });
  await syncCommission(id);
  await audit(actor, "payment.delete", "payment", id, `Deleted payment ${id} (₹${payment.amountInr} ${payment.status})`, payment);
  return json({ ok: true, message: "Deleted." });
}
