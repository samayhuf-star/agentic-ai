import type { Prisma } from "@prisma/client";
import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import * as v from "@/lib/admin/validate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) return json({ message: "That agent was not found." }, 404);
  const body = await readJson(request);
  try {
    const data: Prisma.AgentUpdateInput = {};
    if ("name" in body) data.name = v.text(body.name, "Name", 60, true)!;
    if ("role" in body) data.role = v.text(body.role, "Role", 80, true)!;
    if ("blurb" in body) data.blurb = v.text(body.blurb, "Description", 600, true)!;
    if ("color" in body) {
      const color = String(body.color || "").trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new v.InputError("Color must look like #a1b2c3.");
      data.color = color;
    }
    await prisma.agent.update({ where: { id }, data });
    const changed = Object.keys(data);
    await audit(gate.session.email, "agent.update", "agent", id, `Edited agent ${agent.name}: ${changed.join(", ")}`, {
      before: Object.fromEntries(changed.map((key) => [key, (agent as Record<string, unknown>)[key]])),
      after: data,
    });
    return json({ ok: true, message: "Saved." });
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not save." }, 500);
  }
}
