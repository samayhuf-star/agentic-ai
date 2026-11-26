import { prisma } from "@/lib/prisma";
import { recoveryEnabled } from "@/lib/followups/recovery";
import { recoveryWorkerRunning } from "@/lib/followups/worker";

export type HealthSnapshot = {
  ok: boolean;
  db: "operational" | "down";
  ms: number;
  checkedAt: string;
  recovery: { enabled: boolean; worker: boolean };
};

export async function checkHealth(): Promise<HealthSnapshot> {
  const started = Date.now();
  const recovery = { enabled: recoveryEnabled(), worker: recoveryWorkerRunning() };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, db: "operational", ms: Date.now() - started, checkedAt: new Date().toISOString(), recovery };
  } catch {
    return { ok: false, db: "down", ms: Date.now() - started, checkedAt: new Date().toISOString(), recovery };
  }
}
