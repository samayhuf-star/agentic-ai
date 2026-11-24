import { json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const body = await readJson(request);
  const agentId = String(body.agentId || "");
  const row = await prisma.userAgent.findUnique({ where: { userId_agentId: { userId: user.id, agentId } } });
  if (!row) return json({ message: "That person is not on your team." }, 404);
  const data: { enabled?: boolean; pinned?: boolean } = {};
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.pinned === "boolean") data.pinned = body.pinned;
  if (Object.keys(data).length === 0) return json({ message: "Nothing to change." }, 400);
  const saved = await prisma.userAgent.update({ where: { id: row.id }, data });
  return json({ ok: true, enabled: saved.enabled, pinned: saved.pinned });
}
