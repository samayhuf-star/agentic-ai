import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import { createManualPayment } from "@/lib/admin/payments";
import * as v from "@/lib/admin/validate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const body = await readJson(request);
  try {
    const customerId = typeof body.customerId === "string" && body.customerId ? body.customerId : null;
    const customerEmail = v.email(body.customerEmail, false);
    const user = customerId
      ? await prisma.user.findUnique({ where: { id: customerId } })
      : customerEmail
        ? await prisma.user.findUnique({ where: { email: customerEmail } })
        : null;
    if ((customerId || customerEmail) && !user) throw new v.InputError("No customer has that email. Create the customer first.");
    if (!user) throw new v.InputError("Pick the customer this payment belongs to.");
    const payment = await prisma.$transaction((tx) =>
      createManualPayment(tx, {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name || user.businessName,
        amountInr: v.amount(body.amount),
        status: v.paymentStatus(body.status || "paid"),
        method: v.paymentMethod(body.method || "upi"),
        reference: v.text(body.reference, "Reference", 120),
        note: v.text(body.note, "Note", 1000),
        paidAt: v.date(body.paidAt, "Payment date"),
        isTest: v.bool(body.isTest),
        actor,
      }),
    );
    await audit(
      actor,
      "payment.create",
      "payment",
      payment.id,
      `Recorded ₹${payment.amountInr} ${payment.status} for ${user.email || user.id}`,
      { userId: user.id, status: payment.status, method: payment.method, reference: payment.reference, isTest: payment.isTest },
    );
    const access = payment.status === "paid" ? " They can sign in with their email now." : "";
    return json({ ok: true, id: payment.id, message: `Payment recorded.${access}` }, 201);
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not record the payment." }, 500);
  }
}
