import { json } from "@/lib/api";
import { sameOrigin } from "@/lib/admin/api";
import { prisma } from "@/lib/prisma";
import { clientIp, hitLimit } from "@/lib/rate-limit";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,80}$/;

export async function partnerFromToken(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  return prisma.affiliate.findUnique({ where: { token } });
}

/** Token-gated write by the creator. */
export async function requirePartnerWrite(request: Request, token: string) {
  if (!sameOrigin(request)) return { ok: false as const, response: json({ message: "Cross-site request blocked." }, 403) };
  const limit = await hitLimit(`partner:${clientIp(request)}`, 60, 10 * 60 * 1000);
  if (!limit.ok) return { ok: false as const, response: json({ message: "Too many changes. Wait a few minutes." }, 429) };
  const affiliate = await partnerFromToken(token);
  if (!affiliate || affiliate.status === "rejected") return { ok: false as const, response: json({ message: "This link is not valid." }, 404) };
  return { ok: true as const, affiliate, actor: `partner:${affiliate.code}` };
}
