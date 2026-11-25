import { InputError } from "@/lib/admin/validate";
import { isValidCode, normalizeCode } from "@/lib/affiliates/core";
import { prisma } from "@/lib/prisma";

/** "" -> null (no affiliate). Unknown code -> InputError. */
export async function affiliateIdFromCode(input: unknown) {
  const code = normalizeCode(input);
  if (!code) return null;
  if (!isValidCode(code)) throw new InputError("That affiliate code is not valid.");
  const affiliate = await prisma.affiliate.findUnique({ where: { code }, select: { id: true } });
  if (!affiliate) throw new InputError(`No affiliate uses the code ${code}.`);
  return affiliate.id;
}
