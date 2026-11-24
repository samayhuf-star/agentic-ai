import { json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const body = await readJson(request);
  const paused = Boolean(body.paused);
  await prisma.user.update({ where: { id: user.id }, data: { paused } });
  return json({ paused });
}
