import { json, readJson, requireUser } from "@/lib/api";
import { validateBusinessSelection } from "@/lib/business-profile";
import { indianMobile } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { assembleTeam, readGoal } from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const body = await readJson(request);
  if (body.goal && body.businessName == null && body.category == null && body.sells == null) {
    const goal = readGoal(body.goal);
    if (!goal) return json({ message: "Pick a goal." }, 400);
    await prisma.user.update({ where: { id: user.id }, data: { goal } });
    await assembleTeam(user.id, goal);
    return json({ ok: true });
  }
  const businessName = String(body.businessName || "").trim();
  if (businessName.length < 2 || businessName.length > 80) {
    return json({ message: "Enter the business name." }, 400);
  }
  const data: {
    businessName: string;
    sells?: string;
    category?: string;
    businessType?: string;
    customType?: string | null;
    phone?: string | null;
  } = { businessName };
  if (body.category) {
    const parsed = validateBusinessSelection(body);
    if (!parsed.ok) return json({ message: parsed.message }, 400);
    data.category = parsed.value.category;
    data.businessType = parsed.value.businessType;
    data.customType = parsed.value.customType;
    data.sells = parsed.value.sells;
  } else {
    const sells = String(body.sells || "").trim();
    if (sells.length < 2) return json({ message: "Pick a category and a business type." }, 400);
    data.sells = sells;
  }
  if (typeof body.phone === "string") {
    const raw = body.phone.trim();
    if (!raw) {
      data.phone = null;
    } else {
      const mobile = indianMobile(raw);
      if (!mobile.ok) return json({ message: mobile.error }, 400);
      const taken = await prisma.user.findFirst({ where: { phone: mobile.e164, NOT: { id: user.id } } });
      if (taken) return json({ message: "That phone number is already used." }, 409);
      data.phone = mobile.e164;
    }
  }
  await prisma.user.update({ where: { id: user.id }, data });
  return json({ ok: true });
}
