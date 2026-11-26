import * as v from "@/lib/admin/validate";

export type AgentLeadInput = {
  name: string;
  email: string;
  company: string | null;
  need: string;
  agentType: string;
  pagePath: string;
  timeZone: string | null;
  isTest: boolean;
};

/** Internal checks: a need starting with [TEST] or a +test / +leadtest email alias. */
export function looksLikeTestLead(email: string, need: string) {
  return /^\s*\[TEST\]/i.test(need) || /\+(test|leadtest)[a-z0-9._-]*@/i.test(email);
}

export function parseAgentLead(body: Record<string, unknown>): AgentLeadInput {
  const name = v.text(body.name, "Name", 80, true)!;
  const email = v.email(body.email, true)!;
  const company = v.text(body.company, "Company", 120);
  const need = v.text(body.need, "What agent you need", 2000, true)!;
  if (need.length < 5) throw new v.InputError("Tell us a little more about the agent you need.");
  const agentType = (v.text(body.agentType, "Agent type", 160) || "AI agent").slice(0, 160);
  const rawPath = typeof body.pagePath === "string" ? body.pagePath.trim() : "";
  const pagePath = /^\/ai-agents(\/[a-z0-9/-]*)?$/.test(rawPath) ? rawPath : "/ai-agents";
  const tz = typeof body.timeZone === "string" ? body.timeZone.trim() : "";
  const timeZone = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(tz) && tz.length <= 60 ? tz : null;
  if (body.consent !== true) throw new v.InputError("Please confirm we can contact you about your request.");
  return { name, email, company, need, agentType, pagePath, timeZone, isTest: looksLikeTestLead(email, need) };
}
