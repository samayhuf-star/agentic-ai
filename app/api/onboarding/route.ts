import { json, readJson, requireUser } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth";
import { isAdminEmail } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { assembleTeam, readGoal } from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const session = await getSessionFromRequest(request);
  const teamCount = await prisma.userAgent.count({ where: { userId: user.id } });
  const finished = Boolean(user.onboardedAt || teamCount > 0 || session?.isAdmin || user.compAccess || isAdminEmail(user.email || session?.email || ""));
  if (finished) return json({ ok: true, redirect: "/dashboard" });
  const body = await readJson(request);
  const businessName = String(body.businessName || "").trim();
  const sells = String(body.sells || "").trim();
  const goal = readGoal(body.goal);
  if (businessName.length < 2 || businessName.length > 80) {
    return json({ message: "Tell us the business name, in a few words." }, 400);
  }
  if (sells.length < 2 || sells.length > 200) {
    return json({ message: "Tell us what you sell, in a short line." }, 400);
  }
  if (!goal) return json({ message: "Pick the main thing you want help with." }, 400);
  await prisma.user.update({
    where: { id: user.id },
    data: { businessName, sells, goal, onboardedAt: new Date() },
  });
  const team = await assembleTeam(user.id, goal);
  return json({ team });
}
