import { OnboardingForm } from "@/components/OnboardingForm";
import { requireOnboardingUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireOnboardingUser();
  return (
    <div className="page">
      <OnboardingForm />
    </div>
  );
}
