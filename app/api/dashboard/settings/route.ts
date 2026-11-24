import { json, readJson, requireUser } from "@/lib/api";
import { parseBusinessChoice } from "@/lib/business-catalog";
import { prisma } from "@/lib/prisma";
import { indianMobile } from "@/lib/phone";
import { assembleTeam, readGoal } from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const body = await readJson(request);
  if (body.goal) {
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
  const data: { businessName: string; sells?: string; category?: string; businessType?: string; businessCustom?: string | null; phone?: string | null } = { businessName };
  if (body.category) {
    const choice = parseBusinessChoice(body);
    if (!choice.ok) return json({ message: choice.message }, 400);
    data.category = choice.category;
    data.businessType = choice.businessType;
    data.businessCustom = choice.businessCustom;
    data.sells = choice.sells;
  } else if (typeof body.sells === "string") {
    const sells = body.sells.trim();
    if (sells.length < 2) return json({ message: "Keep both the business name and what you sell." }, 400);
    data.sells = sells;
  }
  if (typeof body.phone === "string") {
    const trimmed = body.phone.trim();
    if (!trimmed) data.phone = null;
    else {
      const mobile = indianMobile(trimmed);
      if (!mobile.ok) return json({ message: mobile.error }, 400);
      data.phone = mobile.e164;
    }
  }
  try {
    await prisma.user.update({ where: { id: user.id }, data });
  } catch {
    return json({ message: "That phone number is already used." }, 409);
  }
  return json({ ok: true });
}
