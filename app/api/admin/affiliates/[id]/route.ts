import { Prisma } from "@prisma/client";
import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import { InputError } from "@/lib/admin/validate";
import { newPartnerToken } from "@/lib/affiliates/core";
import { readAffiliate } from "@/lib/affiliates/input";
import { maskedSummary, readPayout, sealPayout } from "@/lib/affiliates/payout";
import { sendApprovalEmail } from "@/lib/affiliates/email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const { id } = await params;
  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) return json({ message: "That affiliate was not found." }, 404);
  const body = await readJson(request);
  const action = typeof body.action === "string" ? body.action : "update";
  try {
    if (action === "regenerateToken") {
      await prisma.affiliate.update({ where: { id }, data: { token: newPartnerToken() } });
      await audit(actor, "affiliate.token", "affiliate", id, `New partner page link for ${affiliate.name}. The old link stopped working.`);
      return json({ ok: true, message: "New link made. The old link no longer works." });
    }
    if (action === "pause" || action === "activate") {
      const status = action === "pause" ? "paused" : "active";
      await prisma.affiliate.update({ where: { id }, data: { status } });
      await audit(actor, `affiliate.${action}`, "affiliate", id, `${action === "pause" ? "Paused" : "Activated"} ${affiliate.name}`);
      return json({ ok: true, message: action === "pause" ? "Paused. New clicks are not tracked." : "Active." });
    }
    if (action === "approve") {
      if (affiliate.status === "active") return json({ ok: true, message: "Already active." });
      await prisma.affiliate.update({ where: { id }, data: { status: "active", reviewedAt: new Date(), reviewedBy: actor } });
      await audit(actor, "affiliate.approve", "affiliate", id, `Approved ${affiliate.name} (${affiliate.code})`, { from: affiliate.status });
      const mailed = affiliate.status === "pending" ? await sendApprovalEmail(affiliate) : false;
      return json({ ok: true, message: `Approved. Their link is live now.${mailed ? " We emailed them." : ""}` });
    }
    if (action === "reject") {
      await prisma.affiliate.update({ where: { id }, data: { status: "rejected", reviewedAt: new Date(), reviewedBy: actor } });
      await audit(actor, "affiliate.reject", "affiliate", id, `Rejected ${affiliate.name} (${affiliate.code})`, { from: affiliate.status });
      return json({ ok: true, message: "Rejected. Their link does not track and their page shows nothing." });
    }
    if (action === "payout") {
      const details = readPayout(body);
      if (!details) throw new InputError("Add payout details.");
      await prisma.affiliate.update({
        where: { id },
        data: { payoutEnc: sealPayout(details), payoutMasked: maskedSummary(details), payoutUpdatedAt: new Date(), payoutUpdatedBy: actor, payoutCheckedAt: new Date() },
      });
      await audit(actor, "affiliate.payout", "affiliate", id, `Changed payout details for ${affiliate.name}`, { before: affiliate.payoutMasked, after: maskedSummary(details) });
      return json({ ok: true, message: "Payout details saved." });
    }
    if (action === "payoutChecked") {
      await prisma.affiliate.update({ where: { id }, data: { payoutCheckedAt: new Date() } });
      await audit(actor, "affiliate.payout_checked", "affiliate", id, `Checked new payout details for ${affiliate.name}`, { masked: affiliate.payoutMasked });
      return json({ ok: true, message: "Marked as checked." });
    }
    if (action !== "update") throw new InputError("Unknown action.");
    const data = readAffiliate(body, true);
    if (typeof data.code === "string" && data.code !== affiliate.code) {
      if (await prisma.affiliate.findUnique({ where: { code: data.code } })) throw new InputError(`The code ${data.code} is already taken.`);
    }
    if (("commissionType" in data || "rate" in data) && !("commissionType" in data && "rate" in data)) {
      throw new InputError("Send both commission type and rate.");
    }
    await prisma.affiliate.update({ where: { id }, data });
    const changed = Object.keys(data).filter((key) => (affiliate as Record<string, unknown>)[key] !== (data as Record<string, unknown>)[key]);
    await audit(actor, "affiliate.update", "affiliate", id, `Edited ${affiliate.name}: ${changed.join(", ") || "nothing"}`, {
      before: Object.fromEntries(changed.map((key) => [key, key === "payoutNotes" ? "(hidden)" : (affiliate as Record<string, unknown>)[key]])),
      after: Object.fromEntries(changed.map((key) => [key, key === "payoutNotes" ? "(hidden)" : (data as Record<string, unknown>)[key]])),
    });
    const codeChanged = changed.includes("code");
    const rateChanged = changed.includes("rate") || changed.includes("commissionType");
    return json({
      ok: true,
      message: `Saved.${codeChanged ? " The old code and links stop working now." : ""}${rateChanged ? " New rate applies to new sales only." : ""}`,
    });
  } catch (error) {
    if (error instanceof InputError) return json({ message: error.message }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return json({ message: "That code is already taken." }, 409);
    console.error(error);
    return json({ message: "Could not save." }, 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) return json({ message: "That affiliate was not found." }, 404);
  const body = await readJson(request);
  if (String(body.confirm || "").trim().toUpperCase() !== affiliate.code) return json({ message: "Type the affiliate code to confirm." }, 400);
  const kept = await prisma.affiliateCommission.count({ where: { affiliateId: id, status: { not: "void" } } });
  if (kept > 0) return json({ message: "This affiliate has commission records. Pause them instead so the books stay complete." }, 400);
  const clicks = await prisma.affiliateClick.count({ where: { affiliateId: id } });
  await prisma.affiliate.delete({ where: { id } });
  await audit(gate.session.email, "affiliate.delete", "affiliate", id, `Deleted affiliate ${affiliate.name} (${affiliate.code})`, {
    code: affiliate.code,
    email: affiliate.email,
    clicks,
  });
  return json({ ok: true, message: "Deleted." });
}
