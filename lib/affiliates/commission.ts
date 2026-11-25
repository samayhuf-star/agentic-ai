import { prisma } from "@/lib/prisma";
import { commissionFor, ruleLabel } from "@/lib/affiliates/core";

export const AUTO_VOID = "Payment not paid";
export const SELF_REFERRAL = "Self-referral";

function sameContact(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

/**
 * Keep the commission for one payment in line with the payment.
 * Paid, real and attributed -> one sale commission (pending).
 * Refunded / failed / test / unattributed -> pending or approved commission is voided;
 * an already paid-out commission gets a negative clawback entry instead.
 * Safe to call any number of times.
 */
export async function syncCommission(paymentId: string) {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { user: { select: { email: true, phone: true } } } });
    const saleKey = `sale:${paymentId}`;
    const clawKey = `clawback:${paymentId}`;
    const [sale, claw] = await Promise.all([
      prisma.affiliateCommission.findUnique({ where: { key: saleKey } }),
      prisma.affiliateCommission.findUnique({ where: { key: clawKey } }),
    ]);
    const eligible = Boolean(payment && payment.status === "paid" && !payment.isTest && payment.affiliateId);

    if (eligible && payment && payment.affiliateId) {
      const affiliate = await prisma.affiliate.findUnique({ where: { id: payment.affiliateId } });
      if (!affiliate) return;
      const self =
        sameContact(affiliate.email, payment.email) ||
        sameContact(affiliate.email, payment.user?.email) ||
        sameContact(affiliate.phone, payment.phone) ||
        sameContact(affiliate.phone, payment.user?.phone);
      const amountInr = commissionFor(affiliate, payment.amountInr);
      const base = {
        affiliateId: affiliate.id,
        paymentId,
        kind: "sale",
        amountInr,
        saleAmountInr: payment.amountInr,
        rateLabel: ruleLabel(affiliate),
      };
      if (!sale) {
        await prisma.affiliateCommission.create({
          data: { ...base, key: saleKey, status: self ? "void" : "pending", voidReason: self ? SELF_REFERRAL : null },
        });
      } else if (sale.status !== "paid" && (sale.affiliateId !== affiliate.id || (sale.status === "void" && sale.voidReason === AUTO_VOID))) {
        await prisma.affiliateCommission.update({
          where: { id: sale.id },
          data: { ...base, status: self ? "void" : "pending", voidReason: self ? SELF_REFERRAL : null, approvedAt: null, approvedBy: null },
        });
      }
      if (claw && (claw.status === "pending" || claw.status === "approved")) {
        await prisma.affiliateCommission.update({ where: { id: claw.id }, data: { status: "void", voidReason: "Payment paid again" } });
      }
      return;
    }

    if (!sale) return;
    if (sale.status === "pending" || sale.status === "approved") {
      await prisma.affiliateCommission.update({ where: { id: sale.id }, data: { status: "void", voidReason: AUTO_VOID } });
    } else if (sale.status === "paid" && !claw) {
      const why = !payment ? "deleted" : payment.isTest ? "marked test" : payment.status;
      await prisma.affiliateCommission.create({
        data: {
          affiliateId: sale.affiliateId,
          paymentId,
          key: clawKey,
          kind: "clawback",
          amountInr: -sale.amountInr,
          saleAmountInr: sale.saleAmountInr,
          rateLabel: sale.rateLabel,
          status: "pending",
          note: `Payment ${why} after commission was paid out`,
        },
      });
    }
  } catch (error) {
    console.error("affiliate commission sync", paymentId, error);
  }
}
