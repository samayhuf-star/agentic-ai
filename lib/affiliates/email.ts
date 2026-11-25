import { appOrigin } from "@/lib/config";
import { sendEmail } from "@/lib/messaging/email";
import { partnerUrl } from "@/lib/affiliates/core";

type Who = { name: string; email: string | null; token: string; code: string };

async function trySend(to: string | null, subject: string, text: string) {
  if (!to) return false;
  try {
    const sent = await sendEmail(to, subject, text);
    return sent.provider === "resend";
  } catch (error) {
    console.error("partner email failed", error);
    return false;
  }
}

export function sendWelcomeEmail(a: Who) {
  const first = a.name.split(" ")[0];
  return trySend(
    a.email,
    "Your AI Time Machine partner application",
    `Hi ${first},

Thanks for applying to the AI Time Machine partner program. We review every application by hand and will email you when you're approved.

Your private dashboard:
${partnerUrl(appOrigin(), a.token)}

Keep this link to yourself. Anyone with it can see your dashboard. Until you're approved, it shows "Under review" and your referral link does not track yet.

Your code: ${a.code}

— AI Time Machine`,
  );
}

export function sendApprovalEmail(a: Who) {
  const first = a.name.split(" ")[0];
  const origin = appOrigin();
  return trySend(
    a.email,
    "You're approved: your AI Time Machine partner link is live",
    `Hi ${first},

You're approved. Your referral link tracks from now on:
${origin}/55-ai-agents?ref=${a.code}

Your dashboard (keep it private):
${partnerUrl(origin, a.token)}

Add each post you make in the dashboard under Content. Each post gets its own link, so you can see which post sold.

— AI Time Machine`,
  );
}
