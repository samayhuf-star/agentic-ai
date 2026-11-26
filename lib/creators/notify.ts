import { appOrigin, formatIst } from "@/lib/config";
import { appNames } from "@/lib/creators/apps";
import type { CreatorApplyInput } from "@/lib/creators/input";
import { sendEmail } from "@/lib/messaging/email";

export function ownerAlertEmails() {
  return (process.env.OWNER_ALERT_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function notifyCreatorApplication(input: CreatorApplyInput & { id: string }, request?: Request) {
  const emails = ownerAlertEmails();
  if (!emails.length) return { sent: false as const, reason: "no_recipients" };
  const origin = appOrigin(request);
  const apps = appNames(input.selectedApps).join(", ");
  const subject = `${input.isTest ? "[TEST] " : ""}[Creators] New application — ${input.name}`;
  const body = [
    `${input.isTest ? "TEST APPLICATION (please ignore if this was an internal check)." : "A creator applied to make content."}`,
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone / WhatsApp: ${input.phone || "—"}`,
    `Country: ${input.country}`,
    `Apps: ${apps}`,
    `Platform: ${input.platform}`,
    `Profiles: ${input.profileUrls.join(", ")}`,
    `Followers: ${input.followerRange}`,
    `Niche: ${input.niche}`,
    `Content: ${input.contentTypes.join(", ")}`,
    `Languages: ${input.languages}`,
    `Samples: ${input.sampleLinks.join(", ") || "—"}`,
    `Note: ${input.note || "—"}`,
    `Received: ${formatIst(new Date())}`,
    "",
    `Review in admin: ${origin}/sup-admin/creators`,
  ].join("\n");
  try {
    await Promise.all(emails.map((email) => sendEmail(email, subject, body)));
    return { sent: true as const };
  } catch (error) {
    console.error("creator application email failed", error);
    return { sent: false as const, reason: "send_failed" };
  }
}
