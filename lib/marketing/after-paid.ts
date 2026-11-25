import type { Prisma } from "@prisma/client";
import { appOrigin } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { metaCapiEnabled, sendMetaEvent } from "@/lib/marketing/meta";
import type { StoredTouch } from "@/lib/marketing/server";

/** After Cashfree confirms a sale: copy attribution onto the customer once, and send the server Purchase event once. */
export async function afterPaid(orderId: string) {
  try {
    const p = await prisma.payment.findUnique({ where: { id: orderId } });
    if (!p || p.status !== "paid" || p.isTest || p.gateway !== "cashfree" || !p.gatewayConfirmedAt) return;
    const user = p.userId && (p.mktFirst || p.mktLast) ? await prisma.user.findUnique({ where: { id: p.userId }, select: { id: true, mktFirst: true } }) : null;
    if (user && !user.mktFirst) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mktFirst: (p.mktFirst ?? undefined) as Prisma.InputJsonValue | undefined,
          mktLast: (p.mktLast ?? undefined) as Prisma.InputJsonValue | undefined,
          channelFirst: p.channelFirst,
          channelLast: p.channelLast,
        },
      });
    }
    if (!metaCapiEnabled()) return;
    const claimed = await prisma.payment.updateMany({ where: { id: orderId, capiPurchaseAt: null }, data: { capiPurchaseAt: new Date() } });
    if (claimed.count !== 1) return;
    const last = (p.mktLast || {}) as StoredTouch;
    await sendMetaEvent({
      name: "Purchase",
      eventId: `purchase_${p.id}`,
      value: p.amountInr,
      email: p.email,
      phone: p.phone,
      fbp: last._fbp,
      fbc: last._fbc,
      ip: last._ip,
      ua: last._ua,
      url: `${appOrigin()}/payment/success`,
    });
  } catch (error) {
    console.error("afterPaid failed", error);
  }
}
