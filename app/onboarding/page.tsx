import { PreviewOnboarding } from "@/components/PreviewOnboarding";
import { SiteFooter } from "@/components/SiteChrome";
import { requireOnboardingUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireOnboardingUser();
  return (
    <>
      <main className="preview-onboard layout-c">
        <header className="onboard-bar">AI Time Machine</header>
        <div className="wrap onboard">
          <PreviewOnboarding />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
