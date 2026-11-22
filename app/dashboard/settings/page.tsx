import { SettingsForm } from "@/components/SettingsForm";
import { displayPhone } from "@/lib/phone";
import { requireDashboardUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireDashboardUser();
  const user = session.user!;
  return (
    <div>
      <p className="br-kicker">Settings</p>
      <h1>Your details</h1>
      <SettingsForm businessName={user.businessName || ""} sells={user.sells || ""} email={user.email || ""} phone={displayPhone(user.phone)} />
      <form action="/api/auth/logout" method="post" style={{ marginTop: 22 }}>
        <button className="btn btn-g" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
