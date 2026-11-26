import assert from "node:assert/strict";
import test from "node:test";
import { badgeFromEvents } from "../lib/admin/email-status";
import {
  buildSvixSignatureHeader,
  eventTypeFromWebhook,
  firstRecipient,
  journeyTitle,
  verifyResendSignature,
} from "../lib/messaging/resend-webhook";

const SECRET = "whsec_dGVzdC1yZXNlbmQtd2ViaG9vay1zZWNyZXQ";
const BODY = JSON.stringify({
  type: "email.opened",
  created_at: "2026-11-26T15:00:00.000Z",
  data: { email_id: "abc", to: ["buyer@gmail.com"], subject: "Your order is waiting" },
});

test("Resend webhook signatures verify and reject tampering", () => {
  const id = "msg_1";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = buildSvixSignatureHeader(SECRET, id, timestamp, BODY);
  assert.equal(verifyResendSignature({ body: BODY, id, timestamp, signature, secret: SECRET }), true);
  assert.equal(verifyResendSignature({ body: BODY + " ", id, timestamp, signature, secret: SECRET }), false);
  assert.equal(verifyResendSignature({ body: BODY, id, timestamp, signature: "v1,aaaa", secret: SECRET }), false);
  assert.equal(
    verifyResendSignature({ body: BODY, id, timestamp: String(Math.floor(Date.now() / 1000) - 901), signature, secret: SECRET }),
    false,
  );
});

test("webhook helpers map events and recipients", () => {
  assert.equal(eventTypeFromWebhook("email.clicked"), "email.clicked");
  assert.equal(eventTypeFromWebhook("email.unknown"), null);
  assert.equal(firstRecipient(["Rekha@Gmail.com"]), "rekha@gmail.com");
  assert.equal(journeyTitle("email.complained", "Still waiting"), "Marked as spam: Still waiting");
  assert.equal(journeyTitle("email.opened", "Hi"), "Email opened: Hi");
});

test("email status badge prefers engagement, then delivery problems", () => {
  assert.equal(badgeFromEvents([]).label, "—");
  assert.equal(badgeFromEvents(["email.delivered", "email.delivered"]).label, "Delivered");
  assert.equal(badgeFromEvents(["email.delivered", "email.opened"]).label, "Opened");
  assert.equal(badgeFromEvents(["email.opened", "email.clicked"]).label, "Clicked");
  assert.equal(badgeFromEvents(["email.delivered", "email.bounced"]).label, "Bounced");
  assert.equal(badgeFromEvents(["email.complained"]).label, "Spam");
  assert.equal(badgeFromEvents(["email.manual"]).label, "Sent (Gmail)");
  assert.equal(badgeFromEvents(["email.manual", "email.delivered"]).label, "Delivered");
});
