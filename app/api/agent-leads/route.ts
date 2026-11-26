import { json, readJson } from "@/lib/api";
import { sameOrigin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import * as v from "@/lib/admin/validate";
import { parseAgentLead } from "@/lib/agent-leads/input";
import { notifyAgentLead } from "@/lib/agent-leads/notify";
import { prisma } from "@/lib/prisma";
import { clientIp, hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OK = "Thanks. We got your request and will reply by email, usually within two business days.";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ message: "Cross-site request blocked." }, 403);
  const body = await readJson(request);
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true, message: OK });
  const limit = await hitLimit(`agent-leads:${clientIp(request)}`, 6, 60 * 60 * 1000);
  if (!limit.ok) return json({ message: "Too many requests from here. Try again in an hour." }, 429);
  try {
    const input = parseAgentLead(body);
    const country = (request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || "").slice(0, 8) || null;
    const referrer = (request.headers.get("referer") || "").slice(0, 300) || null;
    const row = await prisma.agentLead.create({
      data: {
        name: input.name,
        email: input.email,
        company: input.company,
        need: input.need,
        agentType: input.agentType,
        pagePath: input.pagePath,
        timeZone: input.timeZone,
        country,
        referrer,
        consentAt: new Date(),
        isTest: input.isTest,
        status: "new",
      },
    });
    await audit(`lead:${input.email}`, "agent-lead.create", "agent-lead", row.id, `AI agents lead from ${input.name}`, { page: input.pagePath, isTest: input.isTest });
    const emailed = await notifyAgentLead({ ...input, id: row.id, country }, request);
    return json({ ok: true, message: OK, emailed: emailed.sent }, 201);
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not send your request. Please try again." }, 500);
  }
}
