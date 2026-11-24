import { prisma } from "@/lib/prisma";

export async function hitLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const row = await prisma.rateLimit.findUnique({ where: { id: key } });
  if (!row || row.resetAt < now) {
    await prisma.rateLimit.upsert({
      where: { id: key },
      create: { id: key, count: 1, resetAt: new Date(Date.now() + windowMs) },
      update: { count: 1, resetAt: new Date(Date.now() + windowMs) },
    });
    return { ok: true as const };
  }
  if (row.count >= limit) return { ok: false as const, resetAt: row.resetAt };
  await prisma.rateLimit.update({ where: { id: key }, data: { count: { increment: 1 } } });
  return { ok: true as const };
}

export function clientIp(request: Request) {
  return (request.headers.get("x-forwarded-for") || "local").split(",")[0].trim() || "local";
}
