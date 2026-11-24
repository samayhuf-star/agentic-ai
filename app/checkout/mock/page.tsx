import { notFound } from "next/navigation";
import { formatInr, mockPaymentsAllowed, pricing } from "@/lib/config";
import { displayPhone } from "@/lib/phone";
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
      <p>
        {payment.name || "Buyer"} · {payment.email || "No email"} · {payment.phone ? displayPhone(payment.phone) : "No mobile"}
      </p>
      <form action="/api/checkout/mock-complete" method="post">
        <input type="hidden" name="orderId" value={payment.id} />
        <button className="btn btn-p" type="submit">
          Pay {formatInr(payment.amountInr)} (test)
        </button>
      </form>
    </main>
  );
}
