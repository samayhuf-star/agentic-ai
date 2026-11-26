import { prisma } from "@/lib/prisma";
import { appOrigin, mockPaymentsAllowed, pricing } from "@/lib/config";
import { isEmail } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { openLead, saveBuyerContact } from "@/lib/leads";
import { CASHFREE_METHODS_OTHER, CASHFREE_METHODS_UPI, createHostedCheckout, gatewayHasKeys, razorpayStartUrl } from "@/lib/payments/gateways";
import { indianMobile } from "@/lib/phone";
import { getActiveGateway } from "@/lib/settings";
import { attributionFromRequest } from "@/lib/affiliates/attribution";
import { applyMarketingToUser, marketingFromRequest } from "@/lib/marketing/server";
import { metaCapiEnabled, sendMetaEvent } from "@/lib/marketing/meta";
import { deviceLabel, inAppKind } from "@/lib/device";
import { logEvent, paymentSource } from "@/lib/activity/log";

export function readBuyer(input: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
}) {
  const name = String(input.name || "")
    .trim()
    .replace(/\s+/g, " ");
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  const mobile = indianMobile(
    typeof input.phone === "string" ? input.phone : String(input.phone || ""),
  );
  const field =
    !name || name.length < 2
      ? "name"
      : !isEmail(email)
        ? "email"
        : !mobile.ok
          ? "phone"
          : null;
  const message =
    field === "name"
      ? "Enter your full name."
      : field === "email"
        ? "Enter a valid email."
        : field === "phone" && !mobile.ok
          ? mobile.error
          : "";
  if (field || !mobile.ok)
    return { ok: false as const, field: field || "phone", message };
  return {
    ok: true as const,
    name: name.slice(0, 80),
    email,
    phone: mobile.e164,
    digits: mobile.digits,
  };
}

async function bodyOf(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as {
      name?: unknown;
      email?: unknown;
      phone?: unknown;
      pay?: unknown;
    };
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    return {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      pay: form.get("pay"),
    };
  }
  return {};
}

export function paymentMethodsFor(pay: unknown) {
  const value = String(pay || "").trim().toLowerCase();
  if (value === "upi") return CASHFREE_METHODS_UPI;
  if (value === "other") return CASHFREE_METHODS_OTHER;
  return undefined;
}

export async function createCheckout(request: Request) {
  const body = await bodyOf(request);
  const buyer = readBuyer(body);
  if (!buyer.ok) {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json"))
      return { status: 303, redirect: `${appOrigin(request)}/checkout` };
    return { status: 400, message: buyer.message, field: buyer.field };
  }

  return startCheckoutFor(request, buyer, { paymentMethods: paymentMethodsFor(body.pay) });
}

type Buyer = { name: string; email: string; phone: string; digits: string };

/** Create a fresh order for known buyer details (new checkout, or "Pay again" on an expired order). */
export async function startCheckoutFor(request: Request, buyer: Buyer, opts: { retryOf?: string; paymentMethods?: string } = {}) {
  const gateway = await getActiveGateway();
  const amountInr = pricing().inr;
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 400) || null;
  const device = deviceLabel(userAgent);
  const orderId = `br${randomToken().slice(0, 16)}`;
  const origin = appOrigin(request);
  const attribution = await attributionFromRequest(request).catch(() => null);
  const payment = await prisma.payment.create({
    data: {
      id: orderId,
      gateway,
      amountInr,
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
    amountInr,
    source: paymentSource(payment),
    status: "started",
    summary: `Checkout ${orderId} for ${buyer.email} (₹${amountInr.toLocaleString("en-IN")})`,
    detail: opts.retryOf ? `Pay again from ${opts.retryOf}` : buyer.name,
    dedupeKey: `checkout:${orderId}`,
  });
  if (opts.retryOf) {
    await logEvent({
      type: "pay_again",
      email: buyer.email,
      phone: buyer.phone,
      paymentId: orderId,
      amountInr,
      source: paymentSource(payment),
      status: "started",
      summary: `Pay again ${orderId} from ${opts.retryOf} for ${buyer.email}`,
      detail: `device ${device || "unknown"}`,
      dedupeKey: `pay_again:${opts.retryOf}:${orderId}`,
    });
  }
  const inApp = inAppKind(userAgent);
  if (inApp) {
    await logEvent({
      type: "inapp_browser_prompt",
      email: buyer.email,
      phone: buyer.phone,
      paymentId: orderId,
      source: paymentSource(payment),
      status: inApp,
      summary: `In-app browser prompt (${inApp}) at checkout ${orderId}`,
      detail: device,
      dedupeKey: `inapp_browser_prompt:checkout:${orderId}`,
    });
  }
  const existingUser = await prisma.user.findUnique({ where: { email: buyer.email }, select: { id: true } });
  if (existingUser) await applyMarketingToUser(existingUser.id, request, attribution?.affiliateId ?? null);
  // Lead = buyer details entered and checkout started. Browser pixel sends the same event id.
  if (metaCapiEnabled()) {
    const mk = await prisma.payment.findUnique({
      where: { id: orderId },
      select: { mktLast: true },
    });
    const last = (mk?.mktLast || {}) as {
      _fbp?: string;
      _fbc?: string;
      _ip?: string;
      _ua?: string;
    };
    await sendMetaEvent({
      name: "Lead",
      eventId: `lead_${orderId}`,
      email: buyer.email,
      phone: buyer.phone,
      fbp: last._fbp,
      fbc: last._fbc,
      ip: last._ip,
      ua: last._ua,
      url: `${origin}/checkout`,
    });
  }
  await openLead({
    orderId,
    amountInr,
    name: buyer.name,
    email: buyer.email,
    phone: buyer.phone,
    userAgent,
    device,
  });
  await saveBuyerContact({
    orderId,
    amountInr,
    name: buyer.name,
    email: buyer.email,
    phone: buyer.phone,
  });

  if (gatewayHasKeys(gateway)) {
    try {
      const hosted = await createHostedCheckout({
        orderId,
        amountInr,
        origin,
        gateway,
        customer: { name: buyer.name, email: buyer.email, phone: buyer.digits },
        paymentMethods: opts.paymentMethods,
      });
      return { status: 303, orderId, redirect: hosted.url };
    } catch (error) {
      console.error(error);
      return {
        status: 502,
        message: "We could not open checkout. Please try again.",
      };
    }
  }

  if (gateway === "razorpay") {
    // No Razorpay API keys: hand off to the public Razorpay payment page (₹1,999), email + phone prefilled.
    // Paid orders are matched and fulfilled by the Razorpay email catcher (admin "Mark paid via Razorpay").
    return { status: 303, orderId, redirect: razorpayStartUrl(origin, orderId) };
  }

  if (process.env.CHECKOUT_URL && gateway === "cashfree") {
    return { status: 303, orderId, redirect: process.env.CHECKOUT_URL };
  }

  if (mockPaymentsAllowed()) {
    return {
      status: 303,
      orderId,
      redirect: `${origin}/checkout/mock?order=${orderId}&gateway=${gateway}`,
    };
  }

  return {
    status: 503,
    message: "Payments are not set up yet. Add your payment keys.",
  };
}
