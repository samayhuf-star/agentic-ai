import { NextResponse } from "next/server";
import { denyStaffMutation, requireAdmin } from "@/lib/api";
import { readStatsRange } from "@/lib/admin/range";
import { orderRows } from "@/lib/admin/stats";
import { formatIst } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(value: string | number | boolean | null) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const staffDenied = await denyStaffMutation(request);
  if (staffDenied) return staffDenied;
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ message: "Sign in as an admin first." }, { status: 401 });
  const url = new URL(request.url);
  const range = readStatsRange({
    range: url.searchParams.get("range") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    tests: url.searchParams.get("tests") || undefined,
  });
  const status = url.searchParams.get("status") || "all";
  const { rows } = await orderRows(range, status);
  const header = ["when", "order", "email", "amount_inr", "status", "gateway", "test", "refunded_at", "refunded_by"];
  const lines = rows.map((row) =>
    [formatIst(row.shownAt), row.id, row.email, row.amountInr, row.status, row.gateway, row.isTest, row.refundedAt ? formatIst(row.refundedAt) : "", row.refundedBy || ""].map(cell).join(","),
  );
  return new NextResponse([header.join(","), ...lines].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=orders.csv",
      "cache-control": "no-store",
    },
  });
}
