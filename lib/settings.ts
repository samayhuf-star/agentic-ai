import { prisma } from "@/lib/prisma";
import { isGateway, type GatewayName } from "@/lib/payments/signature";

export async function getActiveGateway(): Promise<GatewayName> {
  const row = await prisma.setting.findUnique({ where: { key: "active_gateway" } });
  if (row && isGateway(row.value)) return row.value;
  const fromEnv = process.env.PAYMENT_GATEWAY || "cashfree";
  return isGateway(fromEnv) ? fromEnv : "cashfree";
}

export async function setActiveGateway(gateway: GatewayName) {
  await prisma.setting.upsert({
    where: { key: "active_gateway" },
    update: { value: gateway },
    create: { key: "active_gateway", value: gateway },
  });
}
