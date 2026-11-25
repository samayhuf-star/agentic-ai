import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function audit(
  actorEmail: string,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
  detail?: unknown,
) {
  try {
    await prisma.adminAudit.create({
      data: {
        actorEmail,
        action,
        entity,
        entityId,
        summary: summary.slice(0, 500),
        detail: detail === undefined ? undefined : (JSON.parse(JSON.stringify(detail)) as Prisma.InputJsonValue),
      },
    });
  } catch (error) {
    console.error("admin audit failed", error);
  }
}
