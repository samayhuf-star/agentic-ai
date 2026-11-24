import { redirect } from "next/navigation";
import { isAdminEmail, isStaffEmail } from "@/lib/config";
import { istDayStart } from "@/lib/ist";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ensureTeam } from "@/lib/team";

type ReadySession = {
  isAdmin: boolean;
  email: string;
  user: { id: string; email: string | null; onboardedAt: Date | null; compAccess: boolean } | null;
};

export async function skipsOnboarding(session: ReadySession) {
  if (!session.user) return false;
  const email = session.user.email || session.email;
  if (session.isAdmin || isAdminEmail(email) || isStaffEmail(email) || session.user.compAccess) return true;
  return Boolean(session.user.onboardedAt);
}

export async function requireDashboardUser() {
  const session = await getSession();
  if (!session?.user) redirect(session?.isAdmin ? "/sup-admin" : "/login");
  if (!(await skipsOnboarding(session))) redirect("/onboarding");
  await ensureTeam(session.user.id);
  return session;
}

export async function requireOnboardingUser() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (await skipsOnboarding(session)) redirect("/dashboard");
  return session;
}

export function startOfTodayIst() {
  return istDayStart(new Date());
}

export async function needsYesCount(userId: string) {
  return prisma.approval.count({ where: { userId, status: "pending" } });
}
