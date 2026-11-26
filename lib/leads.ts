import { queueOwnerAlert } from "@/lib/alerts/notify";
import { prisma } from "@/lib/prisma";

export async function saveBuyerContact(input: { orderId: string; phone?: string | null; email?: string | null; name?: string | null; amountInr?: number | null }) {
  const phone = input.phone?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;
  const name = input.name?.trim() || null;
  if (!phone && !email && !name) return;
  try {
    await prisma.payment.updateMany({
      where: { id: input.orderId },
      data: { ...(phone ? { phone } : {}), ...(email ? { email } : {}), ...(name ? { name } : {}) },
    });
    await prisma.lead.updateMany({
      where: { orderId: input.orderId },
      data: { ...(phone ? { phone } : {}), ...(email ? { email } : {}), ...(name ? { name } : {}) },
    });
    queueOwnerAlert({
      kind: "checkout_started",
      dedupeKey: `checkout_started:${input.orderId}`,
      name,
      email,
      phone,
      amountInr: input.amountInr,
      orderId: input.orderId,
      status: "checkout started",
    });
  } catch (error) {
    console.error("buyer contact", error);
  }
}

export async function openLead(input: { orderId: string; amountInr: number; phone?: string | null; email?: string | null; name?: string | null; userAgent?: string | null; device?: string | null }) {
  try {
    await prisma.lead.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        amountInr: input.amountInr,
        status: "pending",
        phone: input.phone || null,
        email: input.email || null,
        name: input.name || null,
        userAgent: input.userAgent || null,
        device: input.device || null,
      },
      update: {
        phone: input.phone || undefined,
        email: input.email || undefined,
        name: input.name || undefined,
      },
    });
  } catch (error) {
    console.error("lead", error);
  }
}

export async function markLeadPaid(input: { orderId: string; amountInr: number; phone?: string | null; userId?: string | null; email?: string | null; name?: string | null }) {
  try {
    await prisma.lead.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        amountInr: input.amountInr,
        status: "paid",
        phone: input.phone || null,
        email: input.email || null,
        name: input.name || null,
        userId: input.userId || null,
        paidAt: new Date(),
      },
      update: {
        status: "paid",
        phone: input.phone || undefined,
        email: input.email || undefined,
        name: input.name || undefined,
        userId: input.userId || undefined,
        paidAt: new Date(),
        amountInr: input.amountInr,
      },
    });
    if (input.email || input.phone) {
      await prisma.lead.updateMany({
        where: {
          status: "pending",
          OR: [...(input.email ? [{ email: input.email }] : []), ...(input.phone ? [{ phone: input.phone }] : [])],
        },
        data: { status: "paid", paidAt: new Date(), userId: input.userId || undefined },
      });
    }
  } catch (error) {
    console.error("lead paid", error);
  }
}

export async function markLeadFailed(orderId: string, status: string) {
  try {
    await prisma.lead.updateMany({ where: { orderId, status: "pending" }, data: { status } });
  } catch (error) {
    console.error("lead failed", error);
  }
}

export async function attachLeadContact(input: { userId?: string | null; phone?: string | null; email?: string | null; name?: string | null }) {
  if (!input.email && !input.name) return;
  const ors = [...(input.userId ? [{ userId: input.userId }] : []), ...(input.phone ? [{ phone: input.phone }] : [])];
  if (ors.length === 0) return;
  try {
    await prisma.lead.updateMany({
      where: { OR: ors },
      data: { email: input.email || undefined, name: input.name || undefined, userId: input.userId || undefined },
    });
  } catch (error) {
    console.error("lead contact", error);
  }
}
