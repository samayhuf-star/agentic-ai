import { prisma } from "@/lib/prisma";
import { appOrigin, mockPaymentsAllowed, pricing } from "@/lib/config";
import { isEmail } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { openLead, saveBuyerContact } from "@/lib/leads";
import { createHostedCheckout, gatewayHasKeys } from "@/lib/payments/gateways";
import { indianMobile } from "@/lib/phone";
import { getActiveGateway } from "@/lib/settings";

export function readBuyer(input: { name?: unknown; email?: unknown; phone?: unknown }) {
  const name = String(input.name || "").trim().replace(/\s+/g, " ");
  const email = String(input.email || "").trim().toLowerCase();
  const mobile = indianMobile(typeof input.phone === "string" ? input.phone : String(input.phone || ""));
  const field = !name || name.length < 2 ? "name" : !isEmail(email) ? "email" : !mobile.ok ? "phone" : null;
  const message = field === "name" ? "Enter your full name." : field === "email" ? "Enter a valid email." : field === "phone" && !mobile.ok ? mobile.error : "";
  if (field || !mobile.ok) return { ok: false as const, field: field || "phone", message };
  return { ok: true as const, name: name.slice(0, 80), email, phone: mobile.e164, digits: mobile.digits };
}

async function bodyOf(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as { name?: unknown; email?: unknown; phone?: unknown };
  }
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return { name: form.get("name"), email: form.get("email"), phone: form.get("phone") };
  }
  return {};
}

export async function createCheckout(request: Request) {
  const buyer = readBuyer(await bodyOf(request));
  if (!buyer.ok) {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return { status: 303, redirect: `${appOrigin(request)}/checkout` };
    return { status: 400, message: buyer.message, field: buyer.field };
  }

  const gateway = await getActiveGateway();
  const amountInr = pricing().inr;
  const orderId = `br${randomToken().slice(0, 16)}`;
  const origin = appOrigin(request);
  await prisma.payment.create({
    data: { id: orderId, gateway, amountInr, status: "pending", name: buyer.name, email: buyer.email, phone: buyer.phone },
  });
  await openLead({ orderId, amountInr, name: buyer.name, email: buyer.email, phone: buyer.phone });
  await saveBuyerContact({ orderId, amountInr, name: buyer.name, email: buyer.email, phone: buyer.phone });

  if (gatewayHasKeys(gateway)) {
    try {
      const hosted = await createHostedCheckout({
        orderId,
        amountInr,
        origin,
        gateway,
        customer: { name: buyer.name, email: buyer.email, phone: buyer.digits },
      });
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
