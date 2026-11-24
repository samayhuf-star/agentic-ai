import { appOrigin } from "@/lib/config";
import { goalLabel } from "@/data/agents";

export function welcomeEmail(user: { businessName: string | null; onboardedAt: Date | null }) {
  const origin = appOrigin();
  const link = user.onboardedAt ? `${origin}/dashboard` : `${origin}/onboarding`;
  const shop = user.businessName ? ` for ${user.businessName}` : "";
  return {
    subject: "Your AI Time Machine team is ready",
    text: [
      "Your payment is in.",
      "",
      `Your team${shop} is ready for a short setup. It takes about two minutes.`,
      link,
      "",
      "Sign in with this email and a one-time code. There is no password.",
      "",
      "Nothing goes live, and no money is spent, until you say yes.",
      "",
      "— AI Time Machine",
      "support@theaitimemachine.com",
    ].join("\n"),
  };
}

export function goalSentence(goal: string | null) {
  if (!goal) return "your business";
  return goalLabel(goal).toLowerCase();
}
