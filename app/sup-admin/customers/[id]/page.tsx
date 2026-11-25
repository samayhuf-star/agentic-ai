import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminKicker } from "@/components/admin/AdminKicker";
import { ActionButton } from "@/components/admin/console/ActionButton";
import { CustomerForm } from "@/components/admin/console/CustomerForm";
import { requireAdminPage } from "@/lib/admin/guard";
import { ACCESS_LABEL, accessOf } from "@/lib/admin/customers";
import { money } from "@/lib/admin/format";
import { METHOD_LABEL } from "@/lib/admin/validate";
import { formatIst, isAdminEmail, isStaffEmail } from "@/lib/config";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { readOnly } = await requireAdminPage();
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      aiKey: { select: { provider: true, model: true, keyLast4: true, isValid: true, lastTestedAt: true } },
      sessions: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, createdAt: true, expiresAt: true } },
      _count: { select: { sessions: true, messages: true, approvals: true, tasks: true } },
    },
  });
  if (!user) notFound();
  const [enabledAgents, pendingApprovals, audit] = await Promise.all([
    prisma.userAgent.count({ where: { userId: id, enabled: true } }),
    prisma.approval.count({ where: { userId: id, status: "pending" } }),
    prisma.adminAudit.findMany({ where: { entity: "customer", entityId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const paid = user.payments.filter((p) => p.status === "paid");
  const kind = accessOf({ suspendedAt: user.suspendedAt, compAccess: user.compAccess, paidCount: paid.length });
  const realTotal = paid.filter((p) => !p.isTest).reduce((sum, p) => sum + p.amountInr, 0);
  const privileged = Boolean(user.email && (isAdminEmail(user.email) || isStaffEmail(user.email)));
  const api = `/api/admin/customers/${user.id}`;

  return (
    <main className="page">
      <AdminKicker kicker="Customer" readOnly={readOnly} />
      <div className="adm-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{user.name || user.businessName || user.email || "Unnamed customer"}</h1>
          <p>
            <span className={`pill ${kind}`}>{ACCESS_LABEL[kind]}</span> {privileged ? <span className="staff-badge">Admin/staff account</span> : null}
          </p>
        </div>
        <div className="row-actions">
          {readOnly ? null : (
            <Link className="btn btn-p btn-sm" href={`/sup-admin/payments/new?customer=${encodeURIComponent(user.email || "")}`}>
              + Record payment
            </Link>
          )}
          {user.suspendedAt ? (
            <ActionButton url={api} method="PATCH" body={{ action: "activate" }} label="Reactivate" readOnly={readOnly} />
          ) : privileged ? null : (
            <ActionButton
              url={api}
              method="PATCH"
              body={{ action: "suspend" }}
              label="Suspend"
              danger
              confirmTitle="Suspend this customer?"
              confirmText="They are signed out now and cannot sign in until you reactivate them. Their data and payments stay."
              readOnly={readOnly}
            />
          )}
          <ActionButton
            url={api}
            method="PATCH"
            body={{ action: "signout" }}
            label="Sign out everywhere"
            confirmTitle="Sign this customer out?"
            confirmText="Ends every active session. They can sign in again with a new code."
            readOnly={readOnly}
          />
        </div>
      </div>

      <div className="adm-cols">
        <section className="adm-section">
          <h2>Details</h2>
          <CustomerForm
            mode="edit"
            readOnly={readOnly}
            initial={{
              id: user.id,
              name: user.name || "",
              email: user.email || "",
              phone: user.phone ? displayPhone(user.phone) : "",
              businessName: user.businessName || "",
              city: user.city || "",
              notes: user.adminNotes || "",
              compAccess: user.compAccess,
              marketingOptOut: user.marketingOptOut,
              paused: user.paused,
            }}
          />
        </section>
        <section className="adm-section">
          <h2>Account</h2>
          <div className="card">
            <dl className="adm-dl">
              <dt>Customer ID</dt>
              <dd className="muted">{user.id}</dd>
              <dt>Joined</dt>
              <dd>{formatIst(user.createdAt)}</dd>
              <dt>Created by</dt>
              <dd>{user.createdByAdmin ? `Admin (${user.createdByAdmin})` : "Checkout"}</dd>
              <dt>Onboarded</dt>
              <dd>{user.onboardedAt ? formatIst(user.onboardedAt) : "Not yet"}</dd>
              <dt>Suspended</dt>
              <dd>{user.suspendedAt ? formatIst(user.suspendedAt) : "No"}</dd>
              <dt>Paid total</dt>
              <dd>{money(realTotal)}</dd>
              <dt>Sessions</dt>
              <dd>
                {user._count.sessions}
                {user.sessions[0] ? <span className="muted"> · last sign-in {formatIst(user.sessions[0].createdAt)}</span> : null}
              </dd>
              <dt>Team</dt>
              <dd>
                {enabledAgents} agents on · {pendingApprovals} waiting for a yes
              </dd>
              <dt>Activity</dt>
              <dd>
                {user._count.messages} chat messages · {user._count.tasks} tasks · {user._count.approvals} approvals
              </dd>
              <dt>AI key</dt>
              <dd>
                {user.aiKey ? `${user.aiKey.provider} · ${user.aiKey.model} · …${user.aiKey.keyLast4} · ${user.aiKey.isValid ? "working" : "not verified"}` : "Not connected"}
              </dd>
              <dt>Category</dt>
              <dd>{[user.category, user.businessType, user.customType].filter(Boolean).join(" · ") || "—"}</dd>
              <dt>Goal</dt>
              <dd>{user.goal || "—"}</dd>
            </dl>
          </div>
        </section>
      </div>

      <section className="adm-section">
        <h2>Payments</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Method</th>
                <th className="adm-hide-sm">Reference</th>
              </tr>
            </thead>
            <tbody>
              {user.payments.length === 0 ? (
                <tr>
                  <td colSpan={5}>No payments. Record one to give lifetime access.</td>
                </tr>
              ) : (
                user.payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/sup-admin/payments/${encodeURIComponent(p.id)}`}>{formatIst(p.paidAt || p.createdAt)}</Link>
                    </td>
                    <td>{money(p.amountInr)}</td>
                    <td>
                      <span className={`pill ${p.status}`}>{p.status}</span>
                      {p.isTest ? <span className="test-badge">TEST</span> : null}
                    </td>
                    <td>{p.method ? METHOD_LABEL[p.method] || p.method : p.gateway}</td>
                    <td className="adm-hide-sm muted">{p.reference || p.gatewayPaymentId || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adm-section">
        <h2>History</h2>
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
      </section>

      {readOnly || privileged ? null : (
        <section className="adm-section card" style={{ borderColor: "rgba(255,138,138,0.35)" }}>
          <h2>Delete customer</h2>
          <p className="muted">
            Removes the account, sign-ins, team, chats and AI key for good. Payment records are kept for the books and unlinked. Suspend instead if you may need them back.
          </p>
          <ActionButton
            url={api}
            method="DELETE"
            label="Delete customer"
            danger
            confirmTitle="Delete this customer for good?"
            confirmText="This cannot be undone."
            typeToConfirm={user.email || user.id}
            redirectTo="/sup-admin/customers"
          />
        </section>
      )}
      <p>
        <Link href="/sup-admin/customers">← Back to customers</Link>
      </p>
    </main>
  );
}
