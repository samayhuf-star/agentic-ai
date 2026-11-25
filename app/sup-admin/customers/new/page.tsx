import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { CustomerForm } from "@/components/admin/console/CustomerForm";
import { requireAdminPage } from "@/lib/admin/guard";
import { pricing } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const { readOnly } = await requireAdminPage();
  if (readOnly) redirect("/sup-admin/customers");
  return (
    <main className="page">
      <AdminKicker kicker="Customers" />
      <h1>New customer</h1>
      <p className="muted">
        The customer signs in at <b>/login</b> with this email and gets a one-time code. A paid or free-access customer can sign in right away. A suspended customer cannot.
      </p>
      <CustomerForm mode="create" defaultAmount={pricing().inr} initial={{ name: "", email: "", phone: "", businessName: "", notes: "" }} />
      <p style={{ marginTop: 18 }}>
        <Link href="/sup-admin/customers">← Back to customers</Link>
      </p>
    </main>
  );
}
