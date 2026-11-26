import { prisma } from "@/lib/prisma";
import { isIndiaGateway, type IndiaGatewayName } from "@/lib/payments/signature";

export async function getActiveGateway(): Promise<IndiaGatewayName> {
  // Env override wins over the admin setting (used to switch Cashfree off fast).
  const forced = (process.env.PAYMENT_GATEWAY_FORCE || "").trim().toLowerCase();
  if (isIndiaGateway(forced)) return forced;
  const resolved = await storedGateway();
  if (resolved === "cashfree" && /^(1|true|yes|on)$/i.test((process.env.CASHFREE_DISABLED || "").trim())) return "razorpay";
  return resolved;
}

async function storedGateway(): Promise<IndiaGatewayName> {
  const row = await prisma.setting.findUnique({ where: { key: "active_gateway" } });
  if (row && isIndiaGateway(row.value)) return row.value;
  const fromEnv = process.env.PAYMENT_GATEWAY || "cashfree";
  return isIndiaGateway(fromEnv) ? fromEnv : "cashfree";
}

export async function setActiveGateway(gateway: IndiaGatewayName) {
  await prisma.setting.upsert({
    where: { key: "active_gateway" },
    update: { value: gateway },
    create: { key: "active_gateway", value: gateway },
  });
}
