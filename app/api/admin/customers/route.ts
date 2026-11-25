import { Prisma } from "@prisma/client";
import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import { createManualPayment } from "@/lib/admin/payments";
import * as v from "@/lib/admin/validate";
import { prisma } from "@/lib/prisma";
import { syncCommission } from "@/lib/affiliates/commission";
import { affiliateIdFromCode } from "@/lib/affiliates/lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const body = await readJson(request);
  try {
    const email = v.email(body.email)!;
    const phone = v.phone(body.phone);
    const name = v.text(body.name, "Name", 80, true);
    const businessName = v.text(body.businessName, "Business name", 120);
    const city = v.text(body.city, "City", 60);
    const adminNotes = v.text(body.notes, "Notes", 2000);
    const access = String(body.access || "none");
    if (!["none", "comp", "paid"].includes(access)) throw new v.InputError("Pick an access type.");
    const suspended = body.status === "suspended";
    const pay =
      access === "paid"
        ? {
            amountInr: v.amount(body.amount),
            method: v.paymentMethod(body.method || "upi"),
            reference: v.text(body.reference, "Reference", 120),
            paidAt: v.date(body.paidAt, "Payment date"),
          }
        : null;
    const affiliateId = pay ? await affiliateIdFromCode(body.affiliateCode) : null;

    const result = await prisma.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email } })) throw new v.InputError("A customer with that email already exists.");
      if (phone && (await tx.user.findUnique({ where: { phone } }))) throw new v.InputError("A customer with that mobile already exists.");
      const user = await tx.user.create({
        data: {
          email,
          phone,
          name,
          businessName,
          city,
          adminNotes,
          compAccess: access === "comp",
          suspendedAt: suspended ? new Date() : null,
          createdByAdmin: actor,
        },
      });
      const payment = pay
        ? await createManualPayment(tx, {
            userId: user.id,
            email,
            phone,
            name,
            amountInr: pay.amountInr,
            status: "paid",
            method: pay.method,
            reference: pay.reference,
            note: "Added with the customer from the admin console.",
            paidAt: pay.paidAt,
            isTest: v.bool(body.isTest),
            actor,
            affiliateId,
          })
        : null;
      return { user, payment };
    });
    await audit(actor, "customer.create", "customer", result.user.id, `Created customer ${email} (${access})`, {
      email,
      access,
      suspended,
      paymentId: result.payment?.id ?? null,
    });
    if (result.payment) {
      await syncCommission(result.payment.id);
      await audit(actor, "payment.create", "payment", result.payment.id, `Recorded ₹${result.payment.amountInr} paid for ${email}`, {
        userId: result.user.id,
      });
    }
    return json({ ok: true, id: result.user.id, paymentId: result.payment?.id ?? null }, 201);
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return json({ message: "That email or mobile is already used." }, 409);
    }
    console.error(error);
    return json({ message: "Could not create the customer." }, 500);
  }
}
