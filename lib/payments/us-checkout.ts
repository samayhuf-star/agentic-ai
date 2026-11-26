import { prisma } from "@/lib/prisma";
import { appOrigin, mockPaymentsAllowed } from "@/lib/config";
import { isEmail } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { openLead, saveBuyerContact } from "@/lib/leads";
import { usMobile } from "@/lib/phone";
import { attributionFromRequest } from "@/lib/affiliates/attribution";
import { applyMarketingToUser, marketingFromRequest } from "@/lib/marketing/server";
import { deviceLabel } from "@/lib/device";
import { logEvent, paymentSource } from "@/lib/activity/log";
import { getStripe } from "@/lib/payments/stripe-client";
import { formatUsdCents, missingStripeEnv, stripePriceId, usPriceCents, US_CHECKOUT_PATH } from "@/lib/us";

export function readUsBuyer(input: { name?: unknown; email?: unknown; phone?: unknown }) {
  const name = String(input.name || "")
    .trim()
    .replace(/\s+/g, " ");
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  const mobile = usMobile(typeof input.phone === "string" ? input.phone : String(input.phone || ""));
  const field = !name || name.length < 2 ? "name" : !isEmail(email) ? "email" : !mobile.ok ? "phone" : null;
  const message =
    field === "name" ? "Enter your full name." : field === "email" ? "Enter a valid email." : field === "phone" && !mobile.ok ? mobile.error : "";
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

type Buyer = { name: string; email: string; phone: string; digits: string };

function integrationIdentifier() {
  const suffix = randomToken().replace(/[^a-zA-Z]/g, "").slice(0, 8).toLowerCase().padEnd(8, "x");
  return `aitm-us-chk-${suffix}`;
}

export async function createUsCheckout(request: Request) {
  const body = await bodyOf(request);
  const buyer = readUsBuyer(body);
  if (!buyer.ok) {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return { status: 303, redirect: `${appOrigin(request)}${US_CHECKOUT_PATH}` };
    return { status: 400, message: buyer.message, field: buyer.field };
  }
  return startUsCheckoutFor(request, buyer);
}

export async function startUsCheckoutFor(request: Request, buyer: Buyer, opts: { retryOf?: string } = {}) {
  const amountUsdCents = usPriceCents();
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 400) || null;
  const device = deviceLabel(userAgent);
  const orderId = `us${randomToken().slice(0, 16)}`;
  const origin = appOrigin(request);
  const attribution = await attributionFromRequest(request).catch(() => null);
  const payment = await prisma.payment.create({
    data: {
      id: orderId,
      gateway: "stripe",
      amountInr: 0,
      currency: "USD",
      amountUsdCents,
      status: "pending",
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      affiliateId: attribution?.affiliateId ?? null,
      refClickId: attribution?.clickId ?? null,
      refPostId: attribution?.postId ?? null,
      ...marketingFromRequest(request, attribution?.affiliateId ?? null),
      userAgent,
      device,
      adminNote: opts.retryOf ? `Pay again from ${opts.retryOf}` : null,
    },
  });
  await logEvent({
    type: "checkout",
    email: buyer.email,
    phone: buyer.phone,
    paymentId: orderId,
    amountInr: 0,
    source: paymentSource(payment),
    status: "started",
    summary: `US checkout ${orderId} for ${buyer.email} (${formatUsdCents(amountUsdCents)})`,
    detail: opts.retryOf ? `Pay again from ${opts.retryOf}` : buyer.name,
    dedupeKey: `checkout:${orderId}`,
  });
  const existingUser = await prisma.user.findUnique({ where: { email: buyer.email }, select: { id: true } });
  if (existingUser) await applyMarketingToUser(existingUser.id, request, attribution?.affiliateId ?? null);
  await openLead({
    orderId,
    amountInr: 0,
    name: buyer.name,
    email: buyer.email,
    phone: buyer.phone,
    userAgent,
    device,
  });
  await saveBuyerContact({
    orderId,
    amountInr: 0,
    name: buyer.name,
    email: buyer.email,
    phone: buyer.phone,
  });

  const stripe = getStripe();
  if (stripe) {
    try {
      const priceId = stripePriceId();
      const lineItems = priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: amountUsdCents,
                product_data: { name: "AI Time Machine — Lifetime access" },
              },
            },
          ];
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: orderId,
        customer_email: buyer.email,
        customer_creation: "if_required",
        line_items: lineItems,
        success_url: `${origin}/payment/success?order_id=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}${US_CHECKOUT_PATH}?canceled=1`,
        metadata: { orderId, market: "us" },
        payment_intent_data: { metadata: { orderId, market: "us" } },
        integration_identifier: integrationIdentifier(),
      } as Parameters<typeof stripe.checkout.sessions.create>[0]);
      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      await prisma.payment.update({ where: { id: orderId }, data: { reference: session.id } });
      return { status: 303, orderId, redirect: session.url };
    } catch (error) {
      console.error(error);
      return { status: 502, message: "We could not open checkout. Please try again." };
    }
  }

  if (mockPaymentsAllowed()) {
    return {
      status: 303,
      orderId,
      redirect: `${origin}/checkout/mock?order=${orderId}&gateway=stripe`,
    };
  }

  const missing = missingStripeEnv();
  return {
    status: 503,
    message: "Card checkout is not open yet. Please write to support@theaitimemachine.com.",
    missing,
  };
}
