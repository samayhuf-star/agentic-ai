import assert from "node:assert/strict";
import test from "node:test";
import { isClarityPath, readClaritySessionId, clarityPlayerUrl } from "../lib/marketing/clarity";
import { stopPointFrom } from "../lib/admin/journey";

test("Clarity loads only on landing, checkout and payment-return pages", () => {
  assert.equal(isClarityPath("/"), true);
  assert.equal(isClarityPath("/55-ai-agents"), true);
  assert.equal(isClarityPath("/55-ai-agents/"), true);
  assert.equal(isClarityPath("/us"), true);
  assert.equal(isClarityPath("/us/55-ai-agents"), true);
  assert.equal(isClarityPath("/checkout"), true);
  assert.equal(isClarityPath("/checkout/start"), true);
  assert.equal(isClarityPath("/payment/success"), true);
  assert.equal(isClarityPath("/pricing"), true);
  assert.equal(isClarityPath("/us/checkout"), true);
  assert.equal(isClarityPath("/dashboard"), false);
  assert.equal(isClarityPath("/sup-admin/payments/abc"), false);
  assert.equal(isClarityPath("/ai-agents/whatsapp"), false);
  assert.equal(isClarityPath("/privacy"), false);
});

test("Clarity session ids are validated", () => {
  assert.equal(readClaritySessionId("abc123xyz"), "abc123xyz");
  assert.equal(readClaritySessionId("  session_1-2  "), "session_1-2");
  assert.equal(readClaritySessionId(""), null);
  assert.equal(readClaritySessionId("short"), null);
  assert.equal(readClaritySessionId("bad id with spaces"), null);
  assert.equal(readClaritySessionId("<script>"), null);
});

test("Clarity player URL stays off without a project id", () => {
  assert.equal(clarityPlayerUrl("abc123xyz"), process.env.NEXT_PUBLIC_CLARITY_ID ? clarityPlayerUrl("abc123xyz") : null);
});

test("stop point names the exact drop-off", () => {
  assert.equal(
    stopPointFrom({
      status: "pending",
      gateway: "cashfree",
      cashfreeStatus: "ACTIVE",
      attempts: [{ status: "USER_DROPPED", method: "upi", message: "User dropped and did not complete the two factor authentication" }],
    }),
    "Opened upi but dropped off: User dropped and did not complete the two factor authentication.",
  );
  assert.equal(
    stopPointFrom({
      status: "failed",
      gateway: "cashfree",
      cashfreeStatus: "EXPIRED",
      attempts: [{ status: "FAILED", method: "upi", error: "Insufficient funds" }],
    }),
    "Payment failed on upi: Insufficient funds.",
  );
  assert.equal(
    stopPointFrom({
      status: "pending",
      gateway: "cashfree",
      cashfreeStatus: "EXPIRED",
      attempts: [{ status: "NOT_ATTEMPTED", method: "bank_transfer" }],
    }),
    "Reached checkout and opened the payment page, but no payment method was started before the order expired.",
  );
  assert.equal(
    stopPointFrom({ status: "pending", gateway: "razorpay", cashfreeStatus: null, attempts: [] }),
    "Cashfree did not create an order, so they were sent to the Razorpay backup page. Payment is not confirmed.",
  );
  assert.equal(stopPointFrom({ status: "paid", gateway: "cashfree", attempts: [{ status: "SUCCESS", method: "upi" }] }), "Paid. Journey complete.");
});
