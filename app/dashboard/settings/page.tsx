import { SettingsScreen } from "@/components/SettingsScreen";
import { publicKeyFor } from "@/lib/ai/keys";
import { displayPhone } from "@/lib/phone";
import { requireDashboardUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireDashboardUser();
  const user = session.user!;
  const key = await publicKeyFor(user.id);
  return (
    <div className="settings-page">
      <p className="br-kicker">Settings</p>
      <h1>Your details</h1>
      <SettingsScreen
        goal={user.goal || ""}
        aiKey={key}
        profile={{
          businessName: user.businessName || "",
          sells: user.sells || "",
          category: user.category || "",
          businessType: user.businessType || "",
          customType: user.customType || "",
          email: user.email || "",
          phone: user.phone ? displayPhone(user.phone) : "",
        }}
      />
      <form action="/api/auth/logout" method="post" style={{ marginTop: 22 }}>
        <button className="btn btn-g" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
