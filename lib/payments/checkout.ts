import { prisma } from "@/lib/prisma";
import { appOrigin, mockPaymentsAllowed, pricing } from "@/lib/config";
import { randomToken } from "@/lib/crypto";
import { createHostedCheckout, gatewayHasKeys } from "@/lib/payments/gateways";
import { getActiveGateway } from "@/lib/settings";
import { openLead } from "@/lib/leads";

export async function createCheckout(request: Request) {
  const gateway = await getActiveGateway();
  const amountInr = pricing().inr;
  const orderId = `br${randomToken().slice(0, 16)}`;
  const origin = appOrigin(request);
  await prisma.payment.create({
    data: { id: orderId, gateway, amountInr, status: "pending" },
  });
  await openLead({ orderId, amountInr });

  if (gatewayHasKeys(gateway)) {
    try {
      const hosted = await createHostedCheckout({ orderId, amountInr, origin, gateway });
      return { status: 303, redirect: hosted.url };
    } catch (error) {
      console.error(error);
      return { status: 502, message: "We could not open checkout. Please try again." };
    }
  }

  if (process.env.CHECKOUT_URL && gateway === "cashfree") {
    return { status: 303, redirect: process.env.CHECKOUT_URL };
  }

  if (mockPaymentsAllowed()) {
    return { status: 303, redirect: `${origin}/checkout/mock?order=${orderId}&gateway=${gateway}` };
  }

  return { status: 503, message: "Payments are not set up yet. Add your payment keys." };
}
