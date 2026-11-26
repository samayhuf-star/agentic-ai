import type { Prisma } from "@prisma/client";

export type AccessKind = "paid" | "comp" | "none" | "suspended";

export const ACCESS_LABEL: Record<AccessKind, string> = {
  paid: "Paid (lifetime)",
  comp: "Free access",
  none: "No access",
  suspended: "Suspended",
};

export function accessOf(user: { suspendedAt: Date | null; compAccess: boolean; paidCount: number }): AccessKind {
  if (user.suspendedAt) return "suspended";
  if (user.paidCount > 0) return "paid";
  if (user.compAccess) return "comp";
  return "none";
}

export function accessWhere(kind: string | undefined): Prisma.UserWhereInput | undefined {
  const paid: Prisma.UserWhereInput = { payments: { some: { status: "paid", isTest: false, gateway: "cashfree", gatewayConfirmedAt: { not: null } } } };
  switch (kind) {
    case "paid":
      return { suspendedAt: null, ...paid };
    case "comp":
      return { suspendedAt: null, compAccess: true, NOT: paid };
    case "none":
      return { suspendedAt: null, compAccess: false, NOT: paid };
    case "suspended":
      return { NOT: { suspendedAt: null } };
    default:
      return undefined;
  }
}
