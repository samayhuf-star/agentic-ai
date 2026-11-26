import { json, readJson, requireAdmin, denyStaffMutation } from "@/lib/api";
import { audit } from "@/lib/admin/audit";
import * as v from "@/lib/admin/validate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["new", "contacted", "archived"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staffDenied = await denyStaffMutation(request);
  if (staffDenied) return staffDenied;
  const session = await requireAdmin(request);
  if (!session) return json({ message: "Sign in as an admin first." }, 401);
  const { id } = await params;
  const body = await readJson(request);
  const data: { isTest?: boolean; status?: string } = {};
  if (body.isTest !== undefined) data.isTest = v.bool(body.isTest);
  if (body.status !== undefined) {
    const status = String(body.status);
    if (!STATUSES.has(status)) return json({ message: "Pick a valid status." }, 400);
    data.status = status;
  }
  if (!Object.keys(data).length) return json({ message: "Nothing to update." }, 400);
  const row = await prisma.agentLead.update({ where: { id }, data });
  await audit(session.email, "agent-lead.update", "agent-lead", id, `Updated AI agents lead ${id}`, data);
  return json({ ok: true, id: row.id, isTest: row.isTest, status: row.status });
}
