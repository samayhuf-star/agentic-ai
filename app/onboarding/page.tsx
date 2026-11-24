import { OnboardingForm } from "@/components/OnboardingForm";
import { AccountHeader, SiteFooter } from "@/components/SiteChrome";
import { previewLayout } from "@/lib/dashboard/preview";
import { requireOnboardingUser } from "@/lib/guard";
import "../preview-layouts.css";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireOnboardingUser();
  const layout = await previewLayout();
  return (
    <div className={layout ? `theme-${layout}` : undefined}>
      <AccountHeader />
      <main className="wrap onboard">
        <OnboardingForm layout={layout} />
      </main>
      <SiteFooter />
    </div>
  );
}
