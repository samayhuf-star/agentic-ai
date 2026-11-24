import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/config";
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
  if (session.isAdmin || isAdminEmail(session.user.email || session.email) || session.user.compAccess) return true;
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
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 60 * 60 * 1000);
}

export async function needsYesCount(userId: string) {
  return prisma.approval.count({ where: { userId, status: "pending" } });
}
