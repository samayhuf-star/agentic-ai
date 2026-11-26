import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { formatIst, isAdminEmail, isStaffEmail } from "@/lib/config";
import { contentLabels, csvCell, platformLabel, rateLabel, selectedAppNames, splitList } from "@/lib/creators/view";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session || (!isAdminEmail(session.email) && !isStaffEmail(session.email))) {
    return NextResponse.json({ message: "Sign in as an admin first." }, { status: 401 });
  }
  const rows = await prisma.creatorApplication.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
  const includeRate = rows.some((row) => row.rateType || row.rateNote);
  const header = [
    "when",
    "name",
    "email",
    "phone",
    "country",
    "apps",
    "platform",
    "profile_urls",
    "followers",
    "niche",
    "content_types",
    "languages",
    ...(includeRate ? ["rate_type", "rate_note"] : []),
    "sample_links",
    "note",
    "test",
    "status",
  ];
  const lines = rows.map((row) => {
    const cells: Array<string | number | boolean | null | undefined> = [
      formatIst(row.createdAt),
      row.name,
      row.email,
      row.phone,
      row.country,
      selectedAppNames(row.selectedApps).join("; "),
      platformLabel(row.platform),
      splitList(row.profileUrls, "\n").join(" "),
      row.followerRange,
      row.niche,
      contentLabels(row.contentTypes).join("; "),
      row.languages,
    ];
    if (includeRate) cells.push(rateLabel(row.rateType), row.rateNote);
    cells.push(splitList(row.sampleLinks, "\n").join(" "), row.note, row.isTest, row.status);
    return cells.map(csvCell).join(",");
  });
  return new NextResponse([header.join(","), ...lines].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=creator-applications.csv",
      "cache-control": "no-store",
    },
  });
}
