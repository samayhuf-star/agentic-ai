import { OnboardingForm } from "@/components/OnboardingForm";
import { AccountHeader, SiteFooter } from "@/components/SiteChrome";
import { requireOnboardingUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireOnboardingUser();
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
