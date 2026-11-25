import { NextResponse } from "next/server";
import { cookieDomain } from "@/lib/auth";
import { encodeRefCookie, ID_RE, isValidCode, normalizeCode, REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/affiliates/core";
import { appOrigin, isProduction } from "@/lib/config";
import { hashSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { clientIp, hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless|lighthouse/i;
const DEDUPE_MS = 30 * 60 * 1000;

function safePath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  try {
    const url = new URL(value, "https://x.invalid");
    if (url.origin !== "https://x.invalid") return "/";
    url.searchParams.delete("ref");
    url.searchParams.delete("p");
    return `${url.pathname}${url.search}`.slice(0, 500);
  } catch {
    return "/";
  }
}

function cleanReferrer(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return null;
  }
}

function utm(params: URLSearchParams, key: string) {
  const value = params.get(key);
  return value ? value.slice(0, 120) : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode(decodeURIComponent((await params).code || ""));
  const url = new URL(request.url);
  const path = safePath(url.searchParams.get("to"));
  const origin = appOrigin(request);
  const response = NextResponse.redirect(new URL(path, origin), 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (!isValidCode(code)) return response;

  try {
    const affiliate = await prisma.affiliate.findUnique({ where: { code }, select: { id: true, status: true } });
    if (!affiliate || affiliate.status !== "active") return response;

    const ua = (request.headers.get("user-agent") || "").slice(0, 400);
    const ipHash = hashSecret(`ip:${clientIp(request)}`).slice(0, 32);
    const uaHash = hashSecret(`ua:${ua}`).slice(0, 32);
    let clickId: string | null = null;
    const rawPost = url.searchParams.get("p");
    let postId: string | null = null;
    if (rawPost && ID_RE.test(rawPost)) {
      const post = await prisma.affiliatePost.findUnique({ where: { id: rawPost }, select: { affiliateId: true } });
      if (post?.affiliateId === affiliate.id) postId = rawPost;
    }

    if (!BOT_RE.test(ua)) {
      const recent = await prisma.affiliateClick.findFirst({
        where: { affiliateId: affiliate.id, ipHash, uaHash, postId, createdAt: { gte: new Date(Date.now() - DEDUPE_MS) } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (recent) {
        clickId = recent.id;
      } else {
        const limit = await hitLimit(`refclick:${ipHash}`, 30, 10 * 60 * 1000);
        if (limit.ok) {
          const query = new URL(path, "https://x.invalid").searchParams;
          const click = await prisma.affiliateClick.create({
            data: {
              affiliateId: affiliate.id,
              landingPath: new URL(path, "https://x.invalid").pathname.slice(0, 200),
              referrer: cleanReferrer(request.headers.get("referer")),
              utmSource: utm(query, "utm_source"),
              utmMedium: utm(query, "utm_medium"),
              utmCampaign: utm(query, "utm_campaign"),
              utmContent: utm(query, "utm_content"),
              utmTerm: utm(query, "utm_term"),
              ipHash,
              uaHash,
              postId,
            },
            select: { id: true },
          });
          clickId = click.id;
        }
      }
    }

    const domain = cookieDomain(request.headers.get("x-forwarded-host") || request.headers.get("host"));
    response.cookies.set(REF_COOKIE, encodeRefCookie(code, clickId, postId), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
      path: "/",
      maxAge: REF_COOKIE_DAYS * 86400,
      ...(domain ? { domain } : {}),
    });
  } catch (error) {
    console.error("referral click", error);
  }
  return response;
}
