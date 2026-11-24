import { json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const body = await readJson(request);
  const pinned = Boolean(body.pinned);
  const ids = Array.isArray(body.ids) ? body.ids.map((item) => String(item)) : [];
  if (ids.length === 0) return json({ message: "Nothing to reorder." }, 400);
  const rows = await prisma.userAgent.findMany({ where: { userId: user.id, pinned, agentId: { in: ids } } });
  if (rows.length !== ids.length) return json({ message: "That order does not match this group." }, 400);
  await prisma.$transaction(
    ids.map((agentId, index) =>
      prisma.userAgent.update({
        where: { userId_agentId: { userId: user.id, agentId } },
        data: { sortOrder: index },
      }),
    ),
  );
  return json({ ok: true });
}
