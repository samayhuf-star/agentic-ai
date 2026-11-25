import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { PaymentForm } from "@/components/admin/console/PaymentForm";
import { requireAdminPage } from "@/lib/admin/guard";
import { toIstInput } from "@/lib/admin/format";
import { pricing } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { readOnly } = await requireAdminPage();
  if (readOnly) redirect("/sup-admin/payments");
  const { customer } = await searchParams;
  return (
    <main className="page">
      <AdminKicker kicker="Payments" />
      <h1>Record a payment</h1>
      <p className="muted">
        Use this for UPI, bank transfer or cash received outside checkout. A <b>paid</b> payment gives the customer lifetime access, the same as a checkout purchase.
        The customer must exist first. <Link href="/sup-admin/customers/new">Create one</Link>.
      </p>
      <PaymentForm
        mode="create"
        initial={{
          customerEmail: (customer || "").slice(0, 200),
          amount: String(pricing().inr),
          status: "paid",
          method: "upi",
          reference: "",
          note: "",
          paidAt: toIstInput(new Date()),
          isTest: false,
          manual: true,
        }}
      />
      <p style={{ marginTop: 18 }}>
        <Link href="/sup-admin/payments">← Back to payments</Link>
      </p>
    </main>
  );
}
