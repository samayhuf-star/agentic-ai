import { AttributionCard } from "@/components/marketing/AttributionCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { ActionButton } from "@/components/admin/console/ActionButton";
import { PaymentForm } from "@/components/admin/console/PaymentForm";
import { requireAdminPage } from "@/lib/admin/guard";
import { money, toIstInput } from "@/lib/admin/format";
import { PAYMENT_METHODS } from "@/lib/admin/validate";
import { formatIst } from "@/lib/config";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { readOnly } = await requireAdminPage();
  const id = decodeURIComponent((await params).id);
  const payment = await prisma.payment.findUnique({ where: { id }, include: { user: true } });
  if (!payment) notFound();
  const audit = await prisma.adminAudit.findMany({ where: { entity: "payment", entityId: id }, orderBy: { createdAt: "desc" }, take: 20 });
  const manual = payment.gateway === "manual";
  const deletable = manual || payment.isTest;
  const defaultMethod = (PAYMENT_METHODS as readonly string[]).includes(payment.method || "")
    ? payment.method!
    : (PAYMENT_METHODS as readonly string[]).includes(payment.gateway)
      ? payment.gateway
      : "other";

  return (
    <main className="page">
      <AdminKicker kicker="Payment" readOnly={readOnly} />
      <div className="adm-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>
            {money(payment.amountInr)} <span className={`pill ${payment.status}`}>{payment.status}</span>
            {payment.isTest ? <span className="test-badge">TEST</span> : null}
          </h1>
          <p className="muted">
            {payment.id} ·{" "}
            {manual ? (
              <span className="pill">manual</span>
            ) : payment.gatewayConfirmedAt ? (
              <span className="pill paid">Cashfree-confirmed ({payment.gatewayConfirmedVia}) {formatIst(payment.gatewayConfirmedAt)}</span>
            ) : (
              <span className="pill">not confirmed by {payment.gateway}: not counted as a sale</span>
            )}
          </p>
        </div>
      </div>
      <AttributionCard first={payment.mktFirst} last={payment.mktLast} channelFirst={payment.channelFirst} channelLast={payment.channelLast} note={payment.gclid ? `gclid on file for Google Ads offline upload.` : undefined} />
      <div className="adm-cols">
        <section className="adm-section">
          <h2>Edit</h2>
          {manual ? null : (
            <p className="muted">This came from {payment.gateway}. You can change its status, note and test flag. The amount stays what the gateway charged.</p>
          )}
          <PaymentForm
            mode="edit"
            readOnly={readOnly}
            initial={{
              id: payment.id,
              customerEmail: payment.user?.email || "",
              amount: String(payment.amountInr),
              status: payment.status,
              method: defaultMethod,
              reference: payment.reference || payment.gatewayPaymentId || "",
              note: payment.adminNote || "",
              paidAt: toIstInput(payment.paidAt),
              isTest: payment.isTest,
              manual,
            }}
          />
        </section>
        <section className="adm-section">
          <h2>Record</h2>
          <div className="card">
            <dl className="adm-dl">
              <dt>Customer</dt>
              <dd>
                {payment.user ? (
                  <Link href={`/sup-admin/customers/${payment.user.id}`}>{payment.user.email || payment.user.name || payment.user.id}</Link>
                ) : (
                  <span className="muted">Not linked to a customer</span>
                )}
              </dd>
              <dt>Buyer</dt>
              <dd>{[payment.name, payment.email, payment.phone ? displayPhone(payment.phone) : null].filter(Boolean).join(" · ") || "—"}</dd>
              <dt>Source</dt>
              <dd>{payment.gateway}</dd>
              <dt>Created</dt>
              <dd>{formatIst(payment.createdAt)}</dd>
              <dt>Paid at</dt>
              <dd>{payment.paidAt ? formatIst(payment.paidAt) : "—"}</dd>
              <dt>Refunded</dt>
              <dd>{payment.refundedAt ? `${formatIst(payment.refundedAt)} by ${payment.refundedBy || "?"}` : "—"}</dd>
              <dt>Recorded by</dt>
              <dd>{payment.createdBy || "Checkout"}</dd>
              <dt>Last change</dt>
              <dd>{payment.updatedAt ? formatIst(payment.updatedAt) : "—"}</dd>
            </dl>
          </div>
          <h2 style={{ marginTop: 20 }}>History</h2>
          {audit.length === 0 ? (
            <p className="muted">No admin changes yet.</p>
          ) : (
            <ul>
              {audit.map((row) => (
                <li key={row.id}>
                  <span className="muted">{formatIst(row.createdAt)}</span> · {row.summary} <span className="muted">by {row.actorEmail}</span>
                </li>
              ))}
            </ul>
          )}
          {readOnly ? null : deletable ? (
            <div className="card" style={{ marginTop: 18, borderColor: "rgba(255,138,138,0.35)" }}>
              <h2>Delete payment</h2>
              <p className="muted">Removes this record. If it was the customer&apos;s only paid payment, they lose access.</p>
              <ActionButton
                url={`/api/admin/payments/${encodeURIComponent(payment.id)}`}
                method="DELETE"
                label="Delete payment"
                danger
                confirmTitle="Delete this payment?"
                typeToConfirm={payment.id}
                redirectTo="/sup-admin/payments"
              />
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 18 }}>
              Gateway payments cannot be deleted. Mark them refunded or failed instead.
            </p>
          )}
        </section>
      </div>
      <p>
        <Link href="/sup-admin/payments">← Back to payments</Link>
      </p>
    </main>
  );
}
