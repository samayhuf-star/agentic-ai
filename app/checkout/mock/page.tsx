import { notFound } from "next/navigation";
import { formatInr, mockPaymentsAllowed, pricing } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MockCheckoutPage({ searchParams }: { searchParams: Promise<{ order?: string; gateway?: string }> }) {
  if (!mockPaymentsAllowed()) notFound();
  const { order } = await searchParams;
  const payment = order ? await prisma.payment.findUnique({ where: { id: order } }) : null;
  if (!payment) {
    return (
      <main className="page prose">
        <h1>Test checkout</h1>
        <p>That payment could not be found. Go back and tap Buy again.</p>
      </main>
    );
  }
  return (
    <main className="page prose">
      <p className="draft">Test payment. No money moves. This stands in for the {payment.gateway} page.</p>
      <h1>Pay {formatInr(payment.amountInr || pricing().inr)}</h1>
      <p>Put your mobile number. In the real checkout, the payment page asks for this. We text your login link there.</p>
      <form className="stack" action="/api/checkout/mock-complete" method="post">
        <input type="hidden" name="orderId" value={payment.id} />
        <label className="field">
          Mobile number
          <input name="phone" type="tel" required placeholder="9876543210" autoComplete="tel" />
        </label>
        <button className="btn btn-p" type="submit">
          Pay {formatInr(payment.amountInr)} (test)
        </button>
      </form>
    </main>
  );
}
