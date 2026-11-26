import type { PaidEvent } from "@/lib/payments/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function parseFormOrJson(raw: string, contentType: string): unknown {
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
  return JSON.parse(raw) as unknown;
}

export function parseCashfreeEvent(payload: unknown): PaidEvent {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const order = asRecord(data?.order);
  const payment = asRecord(data?.payment);
  const customer = asRecord(data?.customer_details);
  const type = text(root?.type);
  const paymentStatus = text(payment?.payment_status).toUpperCase();
  const success = type === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS";
  const failed = type === "PAYMENT_FAILED_WEBHOOK" || paymentStatus === "FAILED";
  return {
    orderId: text(order?.order_id),
    phone: text(customer?.customer_phone) || text(asRecord(payment?.customer_details)?.customer_phone) || null,
    email: text(customer?.customer_email) || text(asRecord(payment?.customer_details)?.customer_email) || null,
    name: text(customer?.customer_name) || text(asRecord(payment?.customer_details)?.customer_name) || null,
    amountInr: order?.order_amount != null ? Math.round(Number(order.order_amount)) : null,
    currency: text(order?.order_currency).toUpperCase() || null,
    gatewayPaymentId: text(payment?.cf_payment_id) || null,
    status: success ? "paid" : failed ? "failed" : "ignored",
    raw: payload,
  };
}

export function parseRazorpayEvent(payload: unknown): PaidEvent {
  const root = asRecord(payload);
  const event = text(root?.event);
  const payloadBody = asRecord(root?.payload);
  const paymentWrap = asRecord(payloadBody?.payment);
  const entity = asRecord(paymentWrap?.entity);
  const notes = asRecord(entity?.notes);
  const amount = entity?.amount != null ? Math.round(Number(entity.amount) / 100) : null;
  const status = event === "payment.captured" ? "paid" : event === "payment.failed" ? "failed" : "ignored";
  return {
    orderId: text(notes?.order_id) || text(entity?.receipt),
    phone: text(entity?.contact) || null,
    amountInr: amount,
    currency: text(entity?.currency).toUpperCase() || null,
    gatewayPaymentId: text(entity?.id) || null,
    status,
    raw: payload,
  };
}

export function parsePayuEvent(payload: unknown): PaidEvent {
  const fields = asRecord(payload) ?? {};
  const statusText = text(fields.status).toLowerCase();
  return {
    orderId: text(fields.udf1) || text(fields.txnid),
    phone: text(fields.phone) || null,
    amountInr: fields.amount != null && text(fields.amount) ? Math.round(Number(fields.amount)) : null,
    currency: text(fields.currency).toUpperCase() || "INR",
    gatewayPaymentId: text(fields.mihpayid) || null,
    status: statusText === "success" ? "paid" : statusText === "failure" ? "failed" : "ignored",
    raw: payload,
  };
}

export function cashfreeWebhookMeta(payload: unknown) {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const order = asRecord(data?.order);
  const payment = asRecord(data?.payment);
  const methodObj = asRecord(payment?.payment_method);
  const errorDetails = asRecord(payment?.error_details);
  const paymentStatus = text(payment?.payment_status).toUpperCase();
  return {
    type: text(root?.type) || null,
    paymentStatus: paymentStatus || null,
    method: text(payment?.payment_group) || (methodObj ? Object.keys(methodObj)[0] : "") || null,
    error: text(errorDetails?.error_description) || text(errorDetails?.error_reason) || text(errorDetails?.error_code) || text(payment?.payment_message) || null,
    orderId: text(order?.order_id) || null,
    cfPaymentId: text(payment?.cf_payment_id) || null,
    amountInr: order?.order_amount != null ? Math.round(Number(order.order_amount)) : null,
  };
}
