import Link from "next/link";
import { PaymentCodeForm } from "@/components/PaymentCodeForm";
import { GtmSuccess } from "@/components/marketing/GtmSuccess";
import { PurchaseEvent } from "@/components/marketing/Pixels";
import { QuietHeader, SiteFooter } from "@/components/SiteChrome";
import { confirmPendingCashfreeOrder } from "@/lib/payments/confirm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payment · AI Time Machine" };

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ order_id?: string }> }) {
  const { order_id: orderId } = await searchParams;
  if (orderId) await confirmPendingCashfreeOrder(orderId);
  const payment = orderId ? await prisma.payment.findUnique({ where: { id: orderId } }) : null;
  const paid = payment?.status === "paid" || payment?.status === "paid_unassigned";
  const failed = payment?.status === "failed";
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
      <GtmSuccess purchase={gtmPurchase} />
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
        ) : failed ? (
          <>
            <h1>The payment did not go through</h1>
            <p className="lead">Nothing was opened on your account. You can try again.</p>
            <Link className="btn btn-p" href="/checkout">
              Try again
            </Link>
          </>
        ) : (
          <>
            <h1>Payment not confirmed yet</h1>
            <p className="lead">If you just paid, wait a moment and check again. If you left the payment page, you can start again.</p>
            <p className="stack">
              <Link className="btn btn-p" href={`/payment/success?order_id=${encodeURIComponent(payment.id)}`}>
                Check again
              </Link>
              <Link className="btn btn-g" href="/checkout">
                Start checkout again
              </Link>
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
