import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import { InputError } from "@/lib/admin/validate";
import { readMetrics } from "@/lib/affiliates/metrics";
import { readNewPost } from "@/lib/affiliates/posts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) return json({ message: "That affiliate was not found." }, 404);
  const body = await readJson(request);
  try {
    const post = readNewPost(body);
    const metrics = readMetrics(body);
    if (await prisma.affiliatePost.findFirst({ where: { affiliateId: id, url: post.url } })) throw new InputError("This post is already added.");
    const actor = gate.session.email;
    const created = await prisma.affiliatePost.create({
      data: { ...post, ...metrics, affiliateId: id, createdBy: actor, metricsUpdatedAt: new Date(), metricsUpdatedBy: actor },
    });
    await audit(actor, "post.create", "affiliate", id, `Added a ${post.platform} post for ${affiliate.name}`, { postId: created.id, url: post.url, ...metrics });
    return json({ ok: true, id: created.id }, 201);
  } catch (error) {
    if (error instanceof InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not add the post." }, 500);
  }
}
