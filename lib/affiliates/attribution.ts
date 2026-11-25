import { prisma } from "@/lib/prisma";
import { decodeRefCookie, readCookie, REF_COOKIE } from "@/lib/affiliates/core";

/** Last-click attribution from the first-party cookie, only for active affiliates. */
export async function attributionFromRequest(request: Request) {
  const ref = decodeRefCookie(readCookie(request, REF_COOKIE));
  if (!ref) return null;
  const affiliate = await prisma.affiliate.findUnique({ where: { code: ref.code }, select: { id: true, status: true } });
  if (!affiliate || affiliate.status !== "active") return null;
  let clickId: string | null = null;
  let postId: string | null = null;
  if (ref.clickId) {
    const click = await prisma.affiliateClick.findUnique({ where: { id: ref.clickId }, select: { id: true, affiliateId: true, postId: true } });
    if (click && click.affiliateId === affiliate.id) {
      clickId = click.id;
      postId = click.postId;
    }
  }
  if (!postId && ref.postId) {
    const post = await prisma.affiliatePost.findUnique({ where: { id: ref.postId }, select: { affiliateId: true } });
    if (post && post.affiliateId === affiliate.id) postId = ref.postId;
  }
  return { affiliateId: affiliate.id, clickId, postId };
}
