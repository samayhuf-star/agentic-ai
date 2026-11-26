import { prisma } from "@/lib/prisma";

export type HealthSnapshot = {
  ok: boolean;
  db: "operational" | "down";
  ms: number;
  checkedAt: string;
};

export async function checkHealth(): Promise<HealthSnapshot> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, db: "operational", ms: Date.now() - started, checkedAt: new Date().toISOString() };
  } catch {
    return { ok: false, db: "down", ms: Date.now() - started, checkedAt: new Date().toISOString() };
  }
}
