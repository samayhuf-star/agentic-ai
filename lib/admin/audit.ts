import { Prisma } from "@prisma/client";
import { logEvent } from "@/lib/activity/log";
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
    await logEvent({
      type: "admin",
      email: actorEmail,
      userId: entity === "customer" ? entityId : null,
      paymentId: entity === "payment" ? entityId : null,
      status: action,
      summary,
      detail: `${actorEmail} · ${entity}${entityId ? ` ${entityId}` : ""}`,
      tag: "admin",
      dedupeKey: `admin:live:${action}:${entity}:${entityId || ""}:${Date.now()}`,
    });
  } catch (error) {
    console.error("admin audit failed", error);
  }
}
