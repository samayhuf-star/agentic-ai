import { json, readJson, requireUser } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth";
import { isAdminEmail, isStaffEmail } from "@/lib/config";
import { publicKeyFor } from "@/lib/ai/keys";
import { prisma } from "@/lib/prisma";
import { assembleTeam, readGoal } from "@/lib/team";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const session = await getSessionFromRequest(request);
  const identity = user.email || session?.email || "";
  const admin = Boolean(session?.isAdmin || isAdminEmail(identity) || isStaffEmail(identity));
  if (user.onboardedAt || user.compAccess || admin) return json({ ok: true, redirect: "/dashboard" });
  const body = await readJson(request);
  if (body.step === "finish") {
    await prisma.user.update({ where: { id: user.id }, data: { onboardedAt: new Date() } });
    return json({ ok: true, redirect: "/dashboard" });
  }
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
    data: { businessName, sells, goal },
  });
  const team = await assembleTeam(user.id, goal, { applyEnabled: true });
  const key = await publicKeyFor(user.id);
  return json({ team, key });
}
