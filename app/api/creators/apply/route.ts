import { Prisma } from "@prisma/client";
import { json, readJson } from "@/lib/api";
import { sameOrigin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import * as v from "@/lib/admin/validate";
import { parseApplication } from "@/lib/creators/input";
import { notifyCreatorApplication } from "@/lib/creators/notify";
import { prisma } from "@/lib/prisma";
import { clientIp, hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ message: "Cross-site request blocked." }, 403);
  const body = await readJson(request);
  if (typeof body.website === "string" && body.website.trim()) {
    return json({ ok: true, message: "Thanks. We received your application and will be in touch if there is a fit." });
  }
  const limit = await hitLimit(`creators:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return json({ message: "Too many applications from here. Try again in an hour." }, 429);
  try {
    const input = parseApplication(body);
    const now = new Date();
    const row = await prisma.creatorApplication.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        country: input.country,
        platform: input.platform,
        profileUrls: input.profileUrls.join("\n"),
        followerRange: input.followerRange,
        niche: input.niche,
        contentTypes: input.contentTypes.join(","),
        languages: input.languages,
        rateType: input.rateType,
        rateNote: input.rateNote,
        sampleLinks: input.sampleLinks.join("\n") || null,
        note: input.note,
        selectedApps: input.selectedApps.join(","),
        consentAt: now,
        isTest: input.isTest,
        status: "new",
      },
    });
    await audit(`applicant:${input.email}`, "creator.apply", "creator-application", row.id, `Creator application from ${input.name}`, {
      apps: input.selectedApps,
      platform: input.platform,
      isTest: input.isTest,
    });
    const emailed = await notifyCreatorApplication({ ...input, id: row.id }, request);
    return json({ ok: true, message: "Thanks. We received your application and will be in touch if there is a fit.", emailed: emailed.sent }, 201);
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return json({ message: "Please try again." }, 409);
    console.error(error);
    return json({ message: "Could not send your application. Please try again." }, 500);
  }
}
