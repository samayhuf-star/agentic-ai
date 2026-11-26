import { appOrigin, formatIst } from "@/lib/config";
import { ownerAlertEmails } from "@/lib/creators/notify";
import type { AgentLeadInput } from "@/lib/agent-leads/input";
import { sendEmail } from "@/lib/messaging/email";

export async function notifyAgentLead(input: AgentLeadInput & { id: string; country: string | null }, request?: Request) {
  const emails = ownerAlertEmails();
  if (!emails.length) return { sent: false as const, reason: "no_recipients" };
  const origin = appOrigin(request);
  const subject = `${input.isTest ? "[TEST] " : ""}[AI agents lead] ${input.name} — ${input.agentType}`;
  const body = [
    input.isTest ? "TEST LEAD (internal check, please ignore)." : "Someone asked about an AI agent on the SEO pages.",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Company: ${input.company || "—"}`,
    `Page: ${origin}${input.pagePath}`,
    `Agent type: ${input.agentType}`,
    `Country (from network, if known): ${input.country || "—"}`,
    `Time zone: ${input.timeZone || "—"}`,
    "",
    "What they need:",
    input.need,
    "",
    `Received: ${formatIst(new Date())}`,
    `Review in admin: ${origin}/sup-admin/agent-leads`,
  ].join("\n");
  try {
    await Promise.all(emails.map((email) => sendEmail(email, subject, body)));
    return { sent: true as const };
  } catch (error) {
    console.error("agent lead email failed", error);
    return { sent: false as const, reason: "send_failed" };
  }
}
