import { AiKeyForm } from "@/components/AiKeyForm";
import { GoalEditor } from "@/components/GoalEditor";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { SettingsForm } from "@/components/SettingsForm";
import { publicKeyFor } from "@/lib/ai/keys";
import { previewLayout } from "@/lib/dashboard/preview";
import { displayPhone } from "@/lib/phone";
import { requireDashboardUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireDashboardUser();
  const user = session.user!;
  const key = await publicKeyFor(user.id);
  const layout = await previewLayout();
  return (
    <div className={layout ? `settings-preview layout-${layout}` : undefined}>
      {layout === "b" ? (
        <nav className="split-menu" aria-label="Settings sections">
          <a href="#key">AI key</a>
          <a href="#goal">Goal</a>
          <a href="#profile">Business</a>
        </nav>
      ) : null}
      <div className={layout === "b" ? "split-main" : undefined}>
      <p className="br-kicker">Settings</p>
      <h1>Your details</h1>
      <h2 id="key" style={{ fontSize: 28 }}>AI provider and key</h2>
      <AiKeyForm initial={key} />
      <div style={{ height: 28 }} />
      <div id="goal">
        <GoalEditor goal={user.goal || ""} />
      </div>
      <div style={{ height: 28 }} />
      {layout ? (
        <ProfileForm
          businessName={user.businessName || ""}
          category={user.category || ""}
          businessType={user.businessType || ""}
          businessCustom={user.businessCustom || ""}
          email={user.email || ""}
          phone={user.phone ? displayPhone(user.phone) : ""}
        />
      ) : (
        <SettingsForm businessName={user.businessName || ""} sells={user.sells || ""} email={user.email || ""} phone={displayPhone(user.phone)} />
      )}
      <form action="/api/auth/logout" method="post" style={{ marginTop: 22 }}>
        <button className="btn btn-g" type="submit">
          Sign out
        </button>
      </form>
      </div>
    </div>
  );
}
