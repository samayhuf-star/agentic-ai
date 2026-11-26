import { redirect } from "next/navigation";
import { CashfreeStart } from "@/components/CashfreeStart";
import { prisma } from "@/lib/prisma";
import { razorpayBackupUrl } from "@/lib/payments/razorpay-backup";

export const dynamic = "force-dynamic";

/** Razorpay payment page with the buyer's email and phone prefilled. */
function razorpayPayUrl(email: string | null, phone: string | null) {
  const url = new URL(razorpayBackupUrl());
  if (email) url.searchParams.set("email", email);
  const digits = (phone || "").replace(/\D/g, "").slice(-10);
  if (digits.length === 10) url.searchParams.set("phone", digits);
  return url.toString();
}

export default async function StartPage({ searchParams }: { searchParams: Promise<{ session?: string; mode?: string; rzp?: string }> }) {
  const { session, mode, rzp } = await searchParams;
  if (rzp) {
    const payment = await prisma.payment
      .findUnique({ where: { id: rzp.slice(0, 80) }, select: { id: true, status: true, email: true, phone: true } })
      .catch(() => null);
    if (payment && (payment.status === "paid" || payment.status === "paid_unassigned")) {
      redirect(`/payment/success?order_id=${encodeURIComponent(payment.id)}`);
    }
    return <CashfreeStart sessionId="" mode="production" razorpayUrl={razorpayPayUrl(payment?.email ?? null, payment?.phone ?? null)} />;
  }
  if (!session) {
    return (
      <main className="page prose">
        <h1>Checkout did not open</h1>
        <p>Go back and tap Buy again.</p>
      </main>
    );
  }
  return <CashfreeStart sessionId={session} mode={mode === "production" ? "production" : "sandbox"} />;
}
