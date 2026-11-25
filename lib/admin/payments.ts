import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { PaymentStatus } from "@/lib/admin/validate";

export function manualPaymentId() {
  return `manual_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}

export type ManualPaymentInput = {
  userId: string | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  amountInr: number;
  status: PaymentStatus;
  method: string;
  reference: string | null;
  note: string | null;
  paidAt: Date | null;
  isTest: boolean;
  actor: string;
};

export async function createManualPayment(tx: Prisma.TransactionClient, input: ManualPaymentInput) {
  const now = new Date();
  return tx.payment.create({
    data: {
      id: manualPaymentId(),
      userId: input.userId,
      gateway: "manual",
      amountInr: input.amountInr,
      status: input.status,
      isTest: input.isTest,
      email: input.email,
      phone: input.phone,
      name: input.name,
      method: input.method,
      reference: input.reference,
      gatewayPaymentId: input.reference,
      adminNote: input.note,
      createdBy: input.actor,
      createdAt: input.paidAt ?? now,
      paidAt: input.status === "paid" || input.status === "refunded" ? input.paidAt ?? now : null,
      refundedAt: input.status === "refunded" ? now : null,
      refundedBy: input.status === "refunded" ? input.actor : null,
      raw: { source: "admin_manual", by: input.actor },
    },
  });
}
