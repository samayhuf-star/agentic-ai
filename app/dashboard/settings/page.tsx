import { AiKeyForm } from "@/components/AiKeyForm";
import { GoalEditor } from "@/components/GoalEditor";
import { SettingsForm } from "@/components/SettingsForm";
import { publicKeyFor } from "@/lib/ai/keys";
import { displayPhone } from "@/lib/phone";
import { requireDashboardUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireDashboardUser();
  const user = session.user!;
  const key = await publicKeyFor(user.id);
  return (
    <div>
      <p className="br-kicker">Settings</p>
      <h1>Your details</h1>
      <h2 style={{ fontSize: 28 }}>AI provider and key</h2>
      <AiKeyForm initial={key} />
      <div style={{ height: 28 }} />
      <GoalEditor goal={user.goal || ""} />
      <div style={{ height: 28 }} />
      <SettingsForm businessName={user.businessName || ""} sells={user.sells || ""} email={user.email || ""} phone={displayPhone(user.phone)} />
      <form action="/api/auth/logout" method="post" style={{ marginTop: 22 }}>
        <button className="btn btn-g" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
