import { json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
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
  const sells = String(body.sells || "").trim();
  if (businessName.length < 2 || sells.length < 2) {
    return json({ message: "Keep both the business name and what you sell." }, 400);
  }
  await prisma.user.update({ where: { id: user.id }, data: { businessName, sells } });
  return json({ ok: true });
}
