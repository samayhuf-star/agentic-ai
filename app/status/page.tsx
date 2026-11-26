import { PageShell } from "@/components/marketing/PageShell";
import { checkHealth } from "@/lib/health";
import { formatIst } from "@/lib/config";
import { pageMeta } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = pageMeta(
  "System status",
  "Live status for the AI Time Machine website and database. Payments are handled by Razorpay.",
  "/status",
);

export default async function StatusPage() {
  const health = await checkHealth();
  const when = formatIst(new Date(health.checkedAt));
  return (
    <PageShell crumbs={[{ name: "Status", path: "/status" }]}>
      <p className="mk-kicker">Status</p>
      <h1>System status</h1>
      <p className="mk-lead">A simple public view of whether this website can reach its database right now. We do not invent a history of incidents we have not published.</p>
      <table className="mk-table">
        <thead>
          <tr><th>System</th><th>Status</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Website and application</td>
            <td>
              <span className="mk-status">
                <span className={health.ok ? "mk-dot" : "mk-dot down"} />
                {health.ok ? "Operational" : "Degraded"}
              </span>
            </td>
            <td>This page is being served. Checked {when}.</td>
          </tr>
          <tr>
            <td>Database</td>
            <td>
              <span className="mk-status">
                <span className={health.db === "operational" ? "mk-dot" : "mk-dot down"} />
                {health.db === "operational" ? "Operational" : "Unavailable"}
              </span>
            </td>
            <td>{health.db === "operational" ? `Responded in ${health.ms} ms.` : "The application could not reach its database."}</td>
          </tr>
          <tr>
            <td>Payments</td>
            <td>Handled by Razorpay</td>
            <td>We do not run a separate public probe of Razorpay’s network. If a payment fails, check your bank or UPI app, then email support.</td>
          </tr>
          <tr>
            <td>Sign-in email</td>
            <td>Sent by our email provider</td>
            <td>We do not display a live mailbox probe here. If a code does not arrive, check spam and request a new code.</td>
          </tr>
        </tbody>
      </table>
      <p className="mk-note">If something looks wrong and you cannot sign in or complete a payment, write to <a href="mailto:support@theaitimemachine.com">support@theaitimemachine.com</a>.</p>
    </PageShell>
  );
}
