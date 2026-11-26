import { prisma } from "@/lib/prisma";

export type EmailBadge = {
  key: "clicked" | "opened" | "delivered" | "manual" | "sent" | "bounced" | "complained" | "failed" | "suppressed" | "delayed" | "none";
  label: string;
};

const RANK: Record<string, number> = {
  complained: 90,
  bounced: 80,
  failed: 70,
  suppressed: 60,
  clicked: 50,
  opened: 40,
  delivered: 30,
  delayed: 25,
  sent: 20,
  manual: 15,
};

const LABEL: Record<string, string> = {
  clicked: "Clicked",
  opened: "Opened",
  delivered: "Delivered",
  delayed: "Delayed",
  sent: "Sent",
  manual: "Sent (Gmail)",
  bounced: "Bounced",
  complained: "Spam",
  failed: "Failed",
  suppressed: "Suppressed",
};

function kindFromType(type: string): string | null {
  if (type === "recovery_email_manual" || type === "email.manual") return "manual";
  if (type.startsWith("email.")) return type.slice("email.".length);
  if (type === "recovery_email_sent" || type === "email.sent") return "sent";
  return null;
}

export function badgeFromEvents(types: string[]): EmailBadge {
  let best: string | null = null;
  let bestRank = 0;
  for (const type of types) {
    const kind = kindFromType(type);
    if (!kind) continue;
    const rank = RANK[kind] || 0;
    if (rank > bestRank) {
      best = kind;
      bestRank = rank;
    }
  }
  if (!best) return { key: "none", label: "—" };
  return { key: best as EmailBadge["key"], label: LABEL[best] || best };
}

export async function loadEmailBadges(payments: Array<{ id: string; email?: string | null }>): Promise<Map<string, EmailBadge>> {
  const out = new Map<string, EmailBadge>();
  if (payments.length === 0) return out;
  const ids = payments.map((row) => row.id);
  const emails = [...new Set(payments.map((row) => (row.email || "").trim().toLowerCase()).filter(Boolean))];
  const events = await prisma.emailEvent.findMany({
    where: {
      OR: [{ paymentId: { in: ids } }, ...(emails.length ? [{ email: { in: emails } }] : [])],
    },
    select: { type: true, email: true, paymentId: true },
    take: 2000,
  });
  const byPayment = new Map<string, string[]>();
  const byEmail = new Map<string, string[]>();
  for (const event of events) {
    if (event.paymentId) {
      const list = byPayment.get(event.paymentId) || [];
      list.push(event.type);
      byPayment.set(event.paymentId, list);
    }
    if (event.email) {
      const list = byEmail.get(event.email) || [];
      list.push(event.type);
      byEmail.set(event.email, list);
    }
  }
  for (const payment of payments) {
    const email = (payment.email || "").trim().toLowerCase();
    const types = [...(byPayment.get(payment.id) || []), ...(email ? byEmail.get(email) || [] : [])];
    out.set(payment.id, badgeFromEvents(types));
  }
  return out;
}
