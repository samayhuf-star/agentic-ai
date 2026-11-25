import { json, readJson } from "@/lib/api";
import { audit } from "@/lib/admin/audit";
import { InputError } from "@/lib/admin/validate";
import { readMetrics } from "@/lib/affiliates/metrics";
import { requirePartnerWrite } from "@/lib/affiliates/partner-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string; postId: string }> };

async function load(request: Request, params: Params["params"]) {
  const { token, postId } = await params;
  const gate = await requirePartnerWrite(request, token);
  if (!gate.ok) return gate;
  const post = await prisma.affiliatePost.findUnique({ where: { id: postId } });
  if (!post || post.affiliateId !== gate.affiliate.id) return { ok: false as const, response: json({ message: "Post not found." }, 404) };
  if (post.locked) return { ok: false as const, response: json({ message: "This post's numbers are locked by our team." }, 403) };
  return { ...gate, post };
}

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await load(request, params);
  if (!ctx.ok) return ctx.response;
  try {
    const metrics = readMetrics(await readJson(request));
    if (Object.keys(metrics).length === 0) throw new InputError("Nothing to update.");
    await prisma.affiliatePost.update({
      where: { id: ctx.post.id },
      data: { ...metrics, metricsSource: "manual", metricsUpdatedAt: new Date(), metricsUpdatedBy: ctx.actor, verified: false, verifiedAt: null, verifiedBy: null },
    });
    const before = { views: ctx.post.views, likes: ctx.post.likes, comments: ctx.post.comments, shares: ctx.post.shares };
    await audit(ctx.actor, "post.metrics", "affiliate", ctx.affiliate.id, `${ctx.affiliate.name} updated post numbers`, { postId: ctx.post.id, before, after: metrics });
    return json({ ok: true, message: "Saved." });
  } catch (error) {
    if (error instanceof InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not save." }, 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await load(request, params);
  if (!ctx.ok) return ctx.response;
  if (ctx.post.verified) return json({ message: "Verified posts can't be removed. Contact us." }, 403);
  await prisma.affiliatePost.delete({ where: { id: ctx.post.id } });
  await audit(ctx.actor, "post.delete", "affiliate", ctx.affiliate.id, `${ctx.affiliate.name} removed a post`, { postId: ctx.post.id, url: ctx.post.url });
  return json({ ok: true });
}
