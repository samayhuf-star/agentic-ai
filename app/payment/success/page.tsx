import Link from "next/link";
import { PaymentCodeForm } from "@/components/PaymentCodeForm";
import { GtmSuccess } from "@/components/marketing/GtmSuccess";
import { PurchaseEvent } from "@/components/marketing/Pixels";
import { QuietHeader, SiteFooter } from "@/components/SiteChrome";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";
import { confirmPendingCashfreeOrder } from "@/lib/payments/confirm";
import { confirmPendingStripeOrder } from "@/lib/payments/confirm-stripe";
import { triggerRecovery } from "@/lib/followups/recovery";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/activity/log";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payment · AI Time Machine" };

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ order_id?: string; retry?: string; session_id?: string }> }) {
  const { order_id: orderId, retry, session_id: sessionId } = await searchParams;
  if (orderId) {
    await confirmPendingCashfreeOrder(orderId);
    await confirmPendingStripeOrder(orderId, sessionId);
  }
  const payment = orderId ? await prisma.payment.findUnique({ where: { id: orderId } }) : null;
  const paid = payment?.status === "paid" || payment?.status === "paid_unassigned";
  const failed = payment?.status === "failed";
  if (payment) {
    await logEvent({
      type: "checkout.return",
      email: payment.email,
      phone: payment.phone,
      paymentId: payment.id,
      amountInr: payment.amountInr,
      status: payment.status,
      summary: `Returned from payment for ${payment.id} (${payment.status})`,
      detail: payment.gateway,
      isTest: payment.isTest,
      dedupeKey: `checkout.return:${payment.id}:${payment.status}:${new Date().toISOString().slice(0, 16)}`,
    });
  }
  // Buyer came back without paying: recovery email #1 now, once per order/email (no-op unless RECOVERY_EMAILS=on).
  if (payment && !paid) await triggerRecovery(payment.id).catch((error) => console.error("recovery trigger", error));
  const gtmPurchase =
    payment &&
    paid &&
    payment.gateway === "cashfree" &&
    payment.gatewayConfirmedAt &&
    !payment.isTest
      ? { transaction_id: payment.id, value: payment.amountInr }
      : undefined;

  return (
    <>
      {gtmPurchase ? <GtmSuccess purchase={gtmPurchase} /> : null}
      <QuietHeader />
      <main className="wrap onboard checkout">
        {!payment ? (
          <>
            <h1>We could not find that payment</h1>
            <p className="lead">Go back and start checkout again. If money left your account, write to support@theaitimemachine.com.</p>
            <Link className="btn btn-p" href="/checkout">
              Back to checkout
            </Link>
          </>
        ) : paid && payment.email ? (
          <>
            {payment.gateway === "cashfree" && payment.gatewayConfirmedAt && !payment.isTest ? <PurchaseEvent orderId={payment.id} value={payment.amountInr} /> : null}
            {payment.gateway === "stripe" && payment.gatewayConfirmedAt && !payment.isTest ? <PurchaseEvent orderId={payment.id} value={(payment.amountUsdCents ?? 0) / 100} currency="USD" market="us" /> : null}
            <h1>Payment received</h1>
            <PaymentCodeForm email={payment.email} orderId={payment.id} />
          </>
        ) : paid ? (
          <>
            <h1>Payment received</h1>
            <p className="lead">We have the payment, but not an email to send the code to. Write to support@theaitimemachine.com with reference {payment.id}.</p>
            <Link className="btn btn-p" href="/contact">
              Contact support
            </Link>
          </>
        ) : payment.gateway === "stripe" ? (
          <>
            <h1>{failed ? "The payment did not go through" : "Payment not finished yet"}</h1>
            <p className="lead">
              {failed
                ? "No money was taken. Your details are saved, so you can pay again."
                : "If you just paid, wait a moment and check again. If you left the payment page, you can pay again. Your details are saved."}
            </p>
            {retry === "failed" ? <p className="field-error">We could not reopen the payment. Please try once more.</p> : null}
            <form method="post" action={`/api/checkout/retry?order=${encodeURIComponent(payment.id)}`} className="stack">
              <button className="btn btn-p" type="submit">
                Pay again
              </button>
            </form>
            <p className="stack">
              <Link className="btn btn-g" href={`/payment/success?order_id=${encodeURIComponent(payment.id)}`}>
                I paid, check again
              </Link>
            </p>
            <p className="payee-note">Payment is processed by Stripe and may show as Rizwiz Enterprises, the company behind AI Time Machine.</p>
          </>
        ) : (
          <>
            <InAppBrowserNotice />
            <h1>{failed ? "The payment did not go through" : "Payment not finished yet"}</h1>
            <p className="lead">
              {failed
                ? "No money was taken. Your details are saved, so you can pay again in one tap."
                : "If you just paid, wait a moment and check again. If the UPI app did not open or you left the payment page, pay again in one tap. Your details are saved."}
            </p>
            {retry === "failed" ? <p className="field-error">We could not reopen the payment. Please try once more.</p> : null}
            <form method="post" action={`/api/checkout/retry?order=${encodeURIComponent(payment.id)}`} className="stack">
              <button className="btn btn-p" type="submit">
                Pay again
              </button>
            </form>
            <p className="pay-ways">Tip: if Google Pay or PhonePe does not open, choose “Pay by UPI ID / QR”, card or net banking on the payment page.</p>
            <div className="rzp-backup stack">
              <p className="lead">
                <strong>Payment didn’t go through?</strong> Pay via Razorpay instead. Same ₹{payment.amountInr.toLocaleString("en-IN")}, UPI, cards or net banking.
              </p>
              <a className="btn btn-g" href={`/checkout/start?rzp=${encodeURIComponent(payment.id)}`}>
                Pay via Razorpay instead
              </a>
            </div>
            <p className="stack">
              <Link className="btn btn-g" href={`/payment/success?order_id=${encodeURIComponent(payment.id)}`}>
                I paid, check again
              </Link>
            </p>
            <p className="payee-note">Payment goes to Rizwiz Enterprises, the company behind AI Time Machine.</p>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
