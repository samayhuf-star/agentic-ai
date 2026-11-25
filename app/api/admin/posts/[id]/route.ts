import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import { InputError } from "@/lib/admin/validate";
import { readMetrics } from "@/lib/affiliates/metrics";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const { id } = await params;
  const post = await prisma.affiliatePost.findUnique({ where: { id }, include: { affiliate: { select: { name: true } } } });
  if (!post) return json({ message: "Post not found." }, 404);
  const body = await readJson(request);
  try {
    const metrics = readMetrics(body);
    const data: Record<string, unknown> = {};
    if (Object.keys(metrics).length) Object.assign(data, metrics, { metricsSource: "manual", metricsUpdatedAt: new Date(), metricsUpdatedBy: actor });
    if (typeof body.verified === "boolean") Object.assign(data, { verified: body.verified, verifiedAt: body.verified ? new Date() : null, verifiedBy: body.verified ? actor : null });
    if (typeof body.locked === "boolean") data.locked = body.locked;
    if (Object.keys(data).length === 0) throw new InputError("Nothing to update.");
    await prisma.affiliatePost.update({ where: { id }, data });
    const what = [Object.keys(metrics).length ? "numbers" : "", "verified" in data ? (data.verified ? "verified" : "unverified") : "", "locked" in data ? (data.locked ? "locked" : "unlocked") : ""].filter(Boolean).join(", ");
    await audit(actor, "post.update", "affiliate", post.affiliateId, `Post for ${post.affiliate.name}: ${what}`, {
      postId: id,
      before: { views: post.views, likes: post.likes, comments: post.comments, shares: post.shares, verified: post.verified, locked: post.locked },
      after: data,
    });
    return json({ ok: true, message: "Saved." });
  } catch (error) {
    if (error instanceof InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not save." }, 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const post = await prisma.affiliatePost.findUnique({ where: { id } });
  if (!post) return json({ message: "Post not found." }, 404);
  await prisma.affiliatePost.delete({ where: { id } });
  await audit(gate.session.email, "post.delete", "affiliate", post.affiliateId, "Removed a post", { postId: id, url: post.url });
  return json({ ok: true });
}
