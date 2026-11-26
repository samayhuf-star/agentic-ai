import type { GatewayName } from "@/lib/payments/signature";

export type PaidEvent = {
  orderId: string;
  phone: string | null;
  email?: string | null;
  name?: string | null;
  amountInr: number | null;
  amountUsdCents?: number | null;
  currency?: string | null;
  gatewayPaymentId: string | null;
  status: "paid" | "failed" | "ignored";
  raw: unknown;
};

export type CheckoutInput = {
  orderId: string;
  amountInr: number;
  origin: string;
  gateway: GatewayName;
  customer: { name: string; email: string; phone: string };
  /** Cashfree payment_methods string. */
  paymentMethods?: string;
};
