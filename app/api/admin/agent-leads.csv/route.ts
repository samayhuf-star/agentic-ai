import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { formatIst, isAdminEmail, isStaffEmail } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quotes a CSV cell and neutralises spreadsheet formulas from public input. */
function cell(value: string | number | boolean | null | undefined) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session || (!isAdminEmail(session.email) && !isStaffEmail(session.email))) {
    return NextResponse.json({ message: "Sign in as an admin first." }, { status: 401 });
  }
  const rows = await prisma.agentLead.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
  const header = ["when_ist", "name", "email", "company", "agent_type", "need", "page", "country", "time_zone", "referrer", "test", "status"];
  const lines = rows.map((row) =>
    [formatIst(row.createdAt), row.name, row.email, row.company, row.agentType, row.need, row.pagePath, row.country, row.timeZone, row.referrer, row.isTest, row.status].map(cell).join(","),
  );
  return new NextResponse([header.join(","), ...lines].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=ai-agent-leads.csv",
      "cache-control": "no-store",
    },
  });
}
