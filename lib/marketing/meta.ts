import { createHash } from "node:crypto";

const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export function metaCapiEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID && process.env.META_CAPI_TOKEN);
}

export type MetaEvent = {
  name: "Lead" | "Purchase";
  eventId: string;
  value?: number;
  email?: string | null;
  phone?: string | null;
  fbp?: string;
  fbc?: string;
  ip?: string;
  ua?: string;
  url?: string;
};

/** Server-side Meta Conversions API. Same event_id as the browser pixel, so Meta dedupes. No-op unless configured. */
export async function sendMetaEvent(e: MetaEvent) {
  if (!metaCapiEnabled()) return { skipped: true };
  const user_data: Record<string, unknown> = {};
  if (e.email) user_data.em = [sha(e.email)];
  if (e.phone) user_data.ph = [sha(e.phone.replace(/\D/g, ""))];
  if (e.fbp) user_data.fbp = e.fbp;
  if (e.fbc) user_data.fbc = e.fbc;
  if (e.ip) user_data.client_ip_address = e.ip;
  if (e.ua) user_data.client_user_agent = e.ua;
  const body: Record<string, unknown> = {
    data: [
      {
        event_name: e.name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: e.eventId,
        action_source: "website",
        event_source_url: e.url,
        user_data,
        custom_data: e.value != null ? { value: e.value, currency: "INR" } : undefined,
      },
    ],
  };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(process.env.NEXT_PUBLIC_META_PIXEL_ID!)}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN!)}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) console.error("Meta CAPI error", res.status, (await res.text()).slice(0, 300));
    return { ok: res.ok };
  } catch (error) {
    console.error("Meta CAPI failed", error instanceof Error ? error.message : error);
    return { ok: false };
  }
}
