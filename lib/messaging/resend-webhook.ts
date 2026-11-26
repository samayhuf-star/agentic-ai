import crypto from "node:crypto";

export const RESEND_WEBHOOK_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
] as const;

export type ResendWebhookEventType = (typeof RESEND_WEBHOOK_EVENTS)[number];

export type ResendWebhookPayload = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[] | string;
    subject?: string;
    click?: { link?: string; userAgent?: string; user_agent?: string; ipAddress?: string };
    bounce?: { message?: string; type?: string };
  };
};

const MAX_SKEW_SECONDS = 300;

export function signingContent(id: string, timestamp: string, body: string) {
  return `${id}.${timestamp}.${body}`;
}

export function signatureFromSecret(secret: string, content: string) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return crypto.createHmac("sha256", key).update(content).digest("base64");
}

export function buildSvixSignatureHeader(secret: string, id: string, timestamp: string, body: string) {
  return `v1,${signatureFromSecret(secret, signingContent(id, timestamp, body))}`;
}

function signatureValues(header: string) {
  return header
    .split(/[\s]+/)
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      const comma = trimmed.indexOf(",");
      return comma >= 0 ? trimmed.slice(comma + 1) : trimmed.replace(/^v1[_=]/, "");
    })
    .filter(Boolean);
}

export function verifyResendSignature(input: {
  body: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  now?: number;
}): boolean {
  const { body, id, timestamp, signature, secret } = input;
  if (!body || !id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  const now = input.now ?? Date.now() / 1000;
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_SECONDS) return false;
  const expected = signatureFromSecret(secret, signingContent(id, timestamp, body));
  const expectedBuf = Buffer.from(expected);
  return signatureValues(signature).some((value) => {
    const got = Buffer.from(value);
    if (got.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(got, expectedBuf);
  });
}

export function firstRecipient(to: unknown): string | null {
  if (Array.isArray(to) && typeof to[0] === "string") return to[0].trim().toLowerCase() || null;
  if (typeof to === "string") return to.trim().toLowerCase() || null;
  return null;
}

export function eventTypeFromWebhook(type: string | undefined): ResendWebhookEventType | null {
  if (!type) return null;
  return (RESEND_WEBHOOK_EVENTS as readonly string[]).includes(type) ? (type as ResendWebhookEventType) : null;
}

export function journeyTitle(type: string, subject?: string | null) {
  const labels: Record<string, string> = {
    "email.sent": "Email sent",
    "email.delivered": "Email delivered",
    "email.delivery_delayed": "Email delayed",
    "email.opened": "Email opened",
    "email.clicked": "Email clicked",
    "email.bounced": "Email bounced",
    "email.complained": "Marked as spam",
    "email.failed": "Email failed",
    "email.suppressed": "Email suppressed",
  };
  const label = labels[type] || type;
  return subject ? `${label}: ${subject}` : label;
}

export function webhookEventSummary(payload: ResendWebhookPayload, type: string) {
  const data = payload.data || {};
  const click = data.click?.link ? `link ${data.click.link}` : null;
  const bounce = data.bounce?.message || data.bounce?.type || null;
  const ua = data.click?.userAgent || data.click?.user_agent || null;
  return [journeyTitle(type, data.subject || null), click, bounce, ua ? `UA ${ua}` : null].filter(Boolean).join(" · ");
}
