import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function requireDashboardUser() {
  const session = await getSession();
  if (!session?.user) redirect(session?.isAdmin ? "/admin" : "/login");
  if (!session.user.onboardedAt) redirect("/onboarding");
  return session;
}

export async function requireOnboardingUser() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.onboardedAt) redirect("/dashboard");
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
