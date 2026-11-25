import { Prisma } from "@prisma/client";
import { json, readJson } from "@/lib/api";
import { sameOrigin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import * as v from "@/lib/admin/validate";
import { appOrigin } from "@/lib/config";
import { newPartnerToken, partnerUrl, suggestCode } from "@/lib/affiliates/core";
import { sendWelcomeEmail } from "@/lib/affiliates/email";
import { DEFAULT_RULE, followers } from "@/lib/affiliates/input";
import { socialUrl } from "@/lib/affiliates/social";
import { prisma } from "@/lib/prisma";
import { clientIp, hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ message: "Cross-site request blocked." }, 403);
  const body = await readJson(request);
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true, message: "Thanks. We'll be in touch." });
  const limit = await hitLimit(`apply:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return json({ message: "Too many applications from here. Try again in an hour." }, 429);
  try {
    const name = v.text(body.name, "Name", 80, true)!;
    const email = v.email(body.email, true)!;
    const phone = v.phone(body.phone);
    if (!phone) throw new v.InputError("Add your phone number.");
    const city = v.text(body.city, "City", 60, true);
    const instagramUrl = socialUrl(body.instagramUrl, "Instagram link", ["instagram"]);
    const tiktokUrl = socialUrl(body.tiktokUrl, "TikTok link", ["tiktok"]);
    if (!instagramUrl && !tiktokUrl) throw new v.InputError("Add your Instagram or TikTok profile link.");
    const followerCount = followers(body.followers);
    if (followerCount === null) throw new v.InputError("Add your follower count.");
    const niche = v.text(body.niche, "Niche", 80, true);
    const pitch = v.text(body.pitch, "Content plan", 2000, true);
    if (body.terms !== true) throw new v.InputError("Please agree to the partner terms.");

    const existing = await prisma.affiliate.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (existing) {
      // Never reveal someone else's dashboard link on screen; email it to the address on file.
      await sendWelcomeEmail(existing);
      return json({ ok: true, existing: true, message: "You've already applied with this email. We've emailed your dashboard link again." });
    }

    let code = "";
    for (let i = 0; i < 10 && !code; i++) {
      const next = suggestCode(name);
      if (!(await prisma.affiliate.findUnique({ where: { code: next } }))) code = next;
    }
    if (!code) throw new Error("no free code");
    const now = new Date();
    const affiliate = await prisma.affiliate.create({
      data: {
        name,
        email,
        phone,
        city,
        instagramUrl,
        tiktokUrl,
        followers: followerCount,
        niche,
        pitch,
        handles: [instagramUrl, tiktokUrl].filter(Boolean).join("\n"),
        code,
        token: newPartnerToken(),
        commissionType: DEFAULT_RULE.commissionType,
        rate: DEFAULT_RULE.rate,
        status: "pending",
        source: "application",
        appliedAt: now,
        termsAcceptedAt: now,
      },
    });
    await audit(`applicant:${email}`, "affiliate.apply", "affiliate", affiliate.id, `New partner application from ${name} (${code})`, {
      instagramUrl,
      tiktokUrl,
      followers: followerCount,
    });
    const emailed = await sendWelcomeEmail(affiliate);
    return json({ ok: true, dashboardUrl: partnerUrl(appOrigin(request), affiliate.token), emailed }, 201);
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return json({ message: "Please try again." }, 409);
    console.error(error);
    return json({ message: "Could not send your application. Please try again." }, 500);
  }
}
