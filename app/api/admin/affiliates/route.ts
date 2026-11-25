import { Prisma } from "@prisma/client";
import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import { InputError } from "@/lib/admin/validate";
import { newPartnerToken, suggestCode } from "@/lib/affiliates/core";
import { readAffiliate } from "@/lib/affiliates/input";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const body = await readJson(request);
  try {
    const data = readAffiliate(body, false);
    let code = typeof data.code === "string" ? data.code : "";
    if (!code) {
      for (let i = 0; i < 8 && !code; i++) {
        const next = suggestCode(String(data.name));
        if (!(await prisma.affiliate.findUnique({ where: { code: next } }))) code = next;
      }
      if (!code) throw new InputError("Could not pick a free code. Type one.");
    } else if (await prisma.affiliate.findUnique({ where: { code } })) {
      throw new InputError(`The code ${code} is already taken.`);
    }
    const affiliate = await prisma.affiliate.create({
      data: {
        ...(data as Prisma.AffiliateUncheckedCreateInput),
        code,
        token: newPartnerToken(),
        createdBy: gate.session.email,
      },
    });
    await audit(gate.session.email, "affiliate.create", "affiliate", affiliate.id, `Added affiliate ${affiliate.name} (${code})`, {
      code,
      commissionType: affiliate.commissionType,
      rate: affiliate.rate,
    });
    return json({ ok: true, id: affiliate.id, code }, 201);
  } catch (error) {
    if (error instanceof InputError) return json({ message: error.message }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return json({ message: "That code is already taken." }, 409);
    console.error(error);
    return json({ message: "Could not add the affiliate." }, 500);
  }
}
