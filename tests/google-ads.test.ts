import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma";
import {
  adsConversionDateTime,
  clickConversionPayload,
  clickIdsFromPayment,
  missingGoogleAdsEnv,
  uploadPaidGoogleConversion,
} from "../lib/marketing/google-ads";
import { markCashfreeConfirmed } from "../lib/payments/confirmed";

test("ads conversion datetime uses the IST offset Google Ads requires", () => {
  const text = adsConversionDateTime(new Date("2026-11-26T10:15:00+05:30"));
  assert.equal(text, "2026-11-26 10:15:00+05:30");
});

test("click conversion includes order id and gclid, and skips when no click id unless enhanced is on", () => {
  const withClick = clickConversionPayload({
    orderId: "brorder1",
    value: 1999,
    at: new Date("2026-11-26T10:15:00+05:30"),
    gclid: "CjwTEST",
    enhanced: false,
  });
  assert.ok(withClick);
  const conv = withClick!.conversions[0] as { orderId: string; gclid: string; conversionValue: number; currencyCode: string; conversionAction: string };
  assert.equal(conv.orderId, "brorder1");
  assert.equal(conv.gclid, "CjwTEST");
  assert.equal(conv.conversionValue, 1999);
  assert.equal(conv.currencyCode, "INR");
  assert.match(conv.conversionAction, /conversionActions\/7918381917$/);

  assert.equal(
    clickConversionPayload({ orderId: "brorder1", value: 1999, at: new Date(), email: "a@b.com", enhanced: false }),
    null,
  );
  const enhanced = clickConversionPayload({
    orderId: "brorder1",
    value: 1999,
    at: new Date("2026-11-26T10:15:00+05:30"),
    email: "Buyer@Shop.Test",
    enhanced: true,
  });
  const ids = (enhanced!.conversions[0] as { userIdentifiers: { hashedEmail: string }[] }).userIdentifiers;
  assert.equal(ids[0].hashedEmail.length, 64);
  assert.notEqual(ids[0].hashedEmail, "Buyer@Shop.Test");
});

test("click ids prefer the payment gclid column, then last/first touch gbraid or wbraid", () => {
  assert.deepEqual(
    clickIdsFromPayment({ gclid: "G1", mktLast: { gb: "GB1", w: "W1" }, mktFirst: { g: "G0" } }),
    { gclid: "G1", gbraid: "GB1", wbraid: "W1" },
  );
  assert.deepEqual(
    clickIdsFromPayment({ gclid: null, mktLast: { gb: "GB2" }, mktFirst: { g: "G0" } }),
    { gclid: "G0", gbraid: "GB2", wbraid: undefined },
  );
});

test("upload is skipped when API credentials are not in env", async () => {
  for (const name of ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN"]) {
    delete process.env[name];
  }
  assert.deepEqual(missingGoogleAdsEnv(), [
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN",
  ]);
  const result = await uploadPaidGoogleConversion("missing-order");
  assert.deepEqual(result, { ok: false, skipped: "no_credentials" });
});

test("a confirmed Cashfree sale with a gclid uploads Purchase (paid) using the order id", async () => {
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "devtok";
  process.env.GOOGLE_ADS_CLIENT_ID = "client";
  process.env.GOOGLE_ADS_CLIENT_SECRET = "secret";
  process.env.GOOGLE_ADS_REFRESH_TOKEN = "refresh";
  const orderId = `brads${Date.now()}`;
  await prisma.payment.create({
    data: {
      id: orderId,
      gateway: "cashfree",
      amountInr: 1999,
      status: "paid",
      isTest: false,
      paidAt: new Date("2026-11-26T10:15:00+05:30"),
      email: `ads-${Date.now()}@shop.test`,
      gclid: "CjwLIVE",
      mktLast: { g: "CjwLIVE", s: "google", m: "cpc" },
    },
  });
  const calls: { url: string; body: unknown }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const raw = init?.body;
    const body =
      typeof raw === "string" && raw.trim().startsWith("{")
        ? JSON.parse(raw)
        : raw instanceof URLSearchParams
          ? Object.fromEntries(raw)
          : raw ?? null;
    calls.push({ url, body });
    if (url.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "ya29.test", expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof fetch;
  try {
    await markCashfreeConfirmed(orderId, "webhook");
    const upload = calls.find((c) => c.url.includes("uploadClickConversions"));
    assert.ok(upload, "expected a conversion upload");
    const payload = upload!.body as { conversions: { orderId: string; gclid: string; conversionValue: number }[] };
    assert.equal(payload.conversions[0].orderId, orderId);
    assert.equal(payload.conversions[0].gclid, "CjwLIVE");
    assert.equal(payload.conversions[0].conversionValue, 1999);
    const row = await prisma.payment.findUniqueOrThrow({ where: { id: orderId } });
    assert.ok(row.googleAdsUploadedAt);
    assert.ok(row.gatewayConfirmedAt);
  } finally {
    globalThis.fetch = original;
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    delete process.env.GOOGLE_ADS_CLIENT_ID;
    delete process.env.GOOGLE_ADS_CLIENT_SECRET;
    delete process.env.GOOGLE_ADS_REFRESH_TOKEN;
  }
});
