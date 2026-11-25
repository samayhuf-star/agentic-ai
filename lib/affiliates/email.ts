import { appOrigin } from "@/lib/config";
import { sendEmail } from "@/lib/messaging/email";
import { partnerUrl } from "@/lib/affiliates/core";
import { prisma } from "@/lib/prisma";

type Who = { id: string; name: string; email: string | null; token: string; code: string; rejectReason?: string | null };
export type EmailKind = "welcome" | "approved" | "rejected";
export type EmailStatus = "sent" | "failed" | "not_configured" | "no_email";

export const PARTNER_FROM = () => process.env.PARTNER_EMAIL_FROM || "AI Time Machine <support@theaitimemachine.com>";
export const resendConfigured = () => Boolean(process.env.RESEND_API_KEY);

async function deliver(a: Who, kind: EmailKind, subject: string, text: string): Promise<EmailStatus> {
  let status: EmailStatus;
  let error: string | null = null;
  if (!a.email) status = "no_email";
  else if (!resendConfigured()) status = "not_configured";
  else {
    try {
      await sendEmail(a.email, subject, text, prisma, { from: PARTNER_FROM() });
      status = "sent";
    } catch (e) {
      status = "failed";
      error = (e instanceof Error ? e.message : String(e)).slice(0, 300);
      console.error("partner email failed", kind, error);
    }
  }
  await prisma.affiliate
    .update({ where: { id: a.id }, data: { lastEmailKind: kind, lastEmailStatus: status, lastEmailAt: new Date(), lastEmailError: error } })
    .catch(() => undefined);
  return status;
}

export async function sendWelcomeEmail(a: Who) {
  const first = a.name.split(" ")[0];
  return (
    (await deliver(
      a,
      "welcome",
      "Your AI Time Machine partner application",
      `Hi ${first},

Thanks for applying to the AI Time Machine partner program. We review every application by hand and will email you when it's decided.

Your private dashboard:
${partnerUrl(appOrigin(), a.token)}

Keep this link to yourself. Anyone with it can see your dashboard. Until you're approved it shows "Under review" and your referral link does not track yet.

— AI Time Machine`,
    )) === "sent"
  );
}

export async function sendApprovalEmail(a: Who) {
  const first = a.name.split(" ")[0];
  const origin = appOrigin();
  return deliver(
    a,
    "approved",
    "You're approved: your AI Time Machine partner link is live",
    `Hi ${first},

Welcome to the AI Time Machine partner program. You're approved, and your referral link tracks from now on:
${origin}/55-ai-agents?ref=${a.code}

Your private dashboard (keep it to yourself):
${partnerUrl(origin, a.token)}

Next step: open the dashboard, go to Payouts and add your UPI ID or bank account, so we can pay your commission.

Then add each post you make under Content analytics. Every post gets its own link, so you can see which post sold.

— AI Time Machine`,
  );
}

export async function sendRejectionEmail(a: Who) {
  const first = a.name.split(" ")[0];
  return deliver(
    a,
    "rejected",
    "Your AI Time Machine partner application",
    `Hi ${first},

Thank you for applying to the AI Time Machine partner program. We're not able to approve your application right now.
${a.rejectReason ? `\nReason: ${a.rejectReason}\n` : ""}
You're welcome to apply again later as your audience grows. Thanks again for your interest.

— AI Time Machine`,
  );
}
