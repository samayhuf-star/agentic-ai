import { json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return json({ message: "Sign in first." }, 401);
  const body = await readJson(request);
  const businessName = String(body.businessName || "").trim();
  const sells = String(body.sells || "").trim();
  if (businessName.length < 2 || sells.length < 2) {
    return json({ message: "Keep both the business name and what you sell." }, 400);
  }
  await prisma.user.update({ where: { id: user.id }, data: { businessName, sells } });
  return json({ ok: true });
}
