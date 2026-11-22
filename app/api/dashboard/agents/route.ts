import { json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const body = await readJson(request);
  const agentId = String(body.agentId || "");
  const enabled = Boolean(body.enabled);
  const row = await prisma.userAgent.findUnique({ where: { userId_agentId: { userId: user.id, agentId } } });
  if (!row) return json({ message: "That person is not on your team." }, 404);
  await prisma.userAgent.update({ where: { id: row.id }, data: { enabled } });
  return json({ ok: true, enabled });
}
