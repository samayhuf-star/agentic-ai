import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReturnPage({ searchParams }: { searchParams: Promise<{ order_id?: string }> }) {
  const { order_id: orderId } = await searchParams;
  const payment = orderId ? await prisma.payment.findUnique({ where: { id: orderId } }) : null;
  const paid = payment?.status === "paid";
  const unassigned = payment?.status === "paid_unassigned";
  return (
    <main className="page prose">
      <h1>{paid ? "Payment received" : unassigned ? "We need your real number" : "Back from checkout"}</h1>
      {paid ? (
        <p>Look for a text message with a link. Open it, add your email, and type the one-time code. That is how you sign in.</p>
      ) : unassigned ? (
        <p>
          The payment was saved, but the phone number was still the sample number. Write to support@adiology.io with this reference: {payment?.id}. We will not open a shared account on that sample number.
        </p>
      ) : (
        <p>If the payment went through, a text message will arrive with a link to add your email. If nothing arrives in a few minutes, write to support@adiology.io.</p>
      )}
      <p>
        <Link href="/">Back to Boardroom</Link>
      </p>
    </main>
  );
}
