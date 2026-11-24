import { headers } from "next/headers";
import { OnboardingForm } from "@/components/OnboardingForm";
import { PreviewOnboarding } from "@/components/PreviewOnboarding";
import { AccountHeader, SiteFooter } from "@/components/SiteChrome";
import { requireOnboardingUser } from "@/lib/guard";
import { PREVIEW_LAYOUT_HEADER, parsePreviewLayout } from "@/lib/preview-layout";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireOnboardingUser();
  const layout = parsePreviewLayout((await headers()).get(PREVIEW_LAYOUT_HEADER));
  if (layout) {
    return (
      <main className={`preview-onboard layout-${layout}`}>
        <header className="onboard-bar">AI Time Machine</header>
        <div className="wrap onboard">
          <PreviewOnboarding />
        </div>
      </main>
    );
  }
  return (
    <>
      <AccountHeader />
      <main className="wrap onboard">
        <OnboardingForm />
      </main>
      <SiteFooter />
    </>
  );
}
