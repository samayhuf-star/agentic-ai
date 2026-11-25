import { json, readJson } from "@/lib/api";
import { audit } from "@/lib/admin/audit";
import { InputError } from "@/lib/admin/validate";
import { requirePartnerWrite } from "@/lib/affiliates/partner-api";
import { maskedSummary, readPayout, sealPayout } from "@/lib/affiliates/payout";
import { MissingEncryptionKey } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { token } = await params;
  const gate = await requirePartnerWrite(request, token);
  if (!gate.ok) return gate.response;
  const { affiliate, actor } = gate;
  try {
    const details = readPayout(await readJson(request));
    if (!details) throw new InputError("Add payout details.");
    const masked = maskedSummary(details);
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { payoutEnc: sealPayout(details), payoutMasked: masked, payoutUpdatedAt: new Date(), payoutUpdatedBy: "creator", payoutCheckedAt: null },
    });
    await audit(actor, "affiliate.payout", "affiliate", affiliate.id, `${affiliate.name} changed their payout details`, { before: affiliate.payoutMasked, after: masked });
    return json({ ok: true, masked, message: "Saved. We check new payout details before the next payout." });
  } catch (error) {
    if (error instanceof InputError) return json({ message: error.message }, 400);
    if (error instanceof MissingEncryptionKey) return json({ message: "We can't save payout details right now. Please try later." }, 503);
    console.error(error);
    return json({ message: "Could not save." }, 500);
  }
}
