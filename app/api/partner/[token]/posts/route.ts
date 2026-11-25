import { json, readJson } from "@/lib/api";
import { audit } from "@/lib/admin/audit";
import { InputError } from "@/lib/admin/validate";
import { readMetrics } from "@/lib/affiliates/metrics";
import { requirePartnerWrite } from "@/lib/affiliates/partner-api";
import { MAX_POSTS, readNewPost } from "@/lib/affiliates/posts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const gate = await requirePartnerWrite(request, token);
  if (!gate.ok) return gate.response;
  const { affiliate, actor } = gate;
  if (affiliate.status === "pending") return json({ message: "You can add posts once you're approved." }, 403);
  const body = await readJson(request);
  try {
    const post = readNewPost(body);
    const metrics = readMetrics(body);
    const count = await prisma.affiliatePost.count({ where: { affiliateId: affiliate.id } });
    if (count >= MAX_POSTS) throw new InputError("You've hit the post limit. Ask us to raise it.");
    if (await prisma.affiliatePost.findFirst({ where: { affiliateId: affiliate.id, url: post.url } })) throw new InputError("You already added this post.");
    const created = await prisma.affiliatePost.create({
      data: { ...post, ...metrics, affiliateId: affiliate.id, createdBy: actor, metricsUpdatedAt: new Date(), metricsUpdatedBy: actor },
    });
    await audit(actor, "post.create", "affiliate", affiliate.id, `${affiliate.name} added a ${post.platform} post`, { postId: created.id, url: post.url, ...metrics });
    return json({ ok: true, id: created.id }, 201);
  } catch (error) {
    if (error instanceof InputError) return json({ message: error.message }, 400);
    console.error(error);
    return json({ message: "Could not add the post." }, 500);
  }
}
