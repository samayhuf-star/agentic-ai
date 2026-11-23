import { OnboardingForm } from "@/components/OnboardingForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { requireOnboardingUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireOnboardingUser();
  return (
    <>
      <SiteHeader />
      <main className="wrap onboard">
        <OnboardingForm />
      </main>
      <SiteFooter />
    </>
  );
}
