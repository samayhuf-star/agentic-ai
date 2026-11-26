import { prisma } from "@/lib/prisma";
import { syncCommission } from "@/lib/affiliates/commission";
import { afterPaid } from "@/lib/marketing/after-paid";
import { uploadPaidGoogleConversion } from "@/lib/marketing/google-ads";

/**
 * Sales rule: a gateway sale counts (affiliate commission, sales-by-source) only once Cashfree itself
 * confirmed it: a signature-verified PAYMENT_SUCCESS webhook, or our server reading order_status PAID
 * from the Cashfree API. Idempotent on the order id.
 */
export async function markCashfreeConfirmed(orderId: string, via: "webhook" | "api") {
  await prisma.payment.updateMany({
    where: { id: orderId, gateway: "cashfree", status: "paid", isTest: false, gatewayConfirmedAt: null },
    data: { gatewayConfirmedAt: new Date(), gatewayConfirmedVia: via },
  });
  await syncCommission(orderId);
  await afterPaid(orderId);
  await uploadPaidGoogleConversion(orderId);
}

/** SQL/Prisma filter for a sale that counts. Manual payments are counted separately. */
export const CONFIRMED_GATEWAY_SALE = { status: "paid", isTest: false, gateway: "cashfree", gatewayConfirmedAt: { not: null } } as const;
export const MANUAL_SALE = { status: "paid", isTest: false, gateway: "manual" } as const;
export const RAZORPAY_SALE = { status: "paid", isTest: false, gateway: "razorpay" } as const;

export function saleKind(p: { gateway: string; gatewayConfirmedAt: Date | null; status: string; isTest: boolean }) {
  if (p.status !== "paid" || p.isTest) return null;
  if (p.gateway === "manual") return "manual" as const;
  if (p.gateway === "cashfree" && p.gatewayConfirmedAt) return "cashfree" as const;
  if (p.gateway === "razorpay") return "razorpay" as const;
  return null;
}
