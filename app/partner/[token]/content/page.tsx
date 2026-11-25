import { notFound } from "next/navigation";
import { num, Stat, StatusBanner } from "@/components/affiliates/PartnerBits";
import { PostsChart } from "@/components/affiliates/PostsChart";
import { PostsManager } from "@/components/affiliates/PostsManager";
import { postUrl } from "@/lib/affiliates/core";
import { postsWithStats, postTotals } from "@/lib/affiliates/dashboard";
import { loadPartner } from "@/lib/affiliates/partner-view";
import { appOrigin, formatIst } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function PartnerContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { affiliate: a, approved, show, hidden } = await loadPartner(token);
  if (hidden.has("content")) notFound();
  const posts = show("content") ? await postsWithStats(a.id) : [];
  const t = postTotals(posts);
  const origin = appOrigin();
  return (
    <main className="page">
      <p className="kicker">Content analytics</p>
      <h1>Your posts</h1>
      <StatusBanner status={a.status} />
      <p className="muted">
        Add each post you make and copy its numbers from Instagram or TikTok insights. Use each post&apos;s own link in that post so we can tell you which post sold. Our team may
        verify numbers; verified or locked posts can&apos;t be changed here.
      </p>
      <div className="stats">
        <Stat label="Posts" value={num(posts.length)} />
        <Stat label="Views" value={num(t.views)} />
        <Stat label="Likes" value={num(t.likes)} />
        <Stat label="Comments" value={num(t.comments)} />
        <Stat label="Shares" value={num(t.shares)} />
        {show("clicks") ? <Stat label="Clicks from posts" value={num(t.clicks)} /> : null}
        {show("sales") ? <Stat label="Sales from posts" value={num(t.sales)} /> : null}
      </div>
      {approved ? (
        <>
          <section className="adm-section">
            <PostsChart posts={posts} />
          </section>
          <section className="adm-section">
            <PostsManager
              admin={false}
              readOnly={false}
              createUrl={`/api/partner/${token}/posts`}
              base={`/api/partner/${token}/posts`}
              posts={posts.map((p) => ({
                id: p.id,
                platform: p.platform,
                url: p.url,
                title: p.title,
                views: p.views,
                likes: p.likes,
                comments: p.comments,
                shares: p.shares,
                clicks: show("clicks") ? p.clicks : 0,
                sales: show("sales") ? p.sales : 0,
                verified: p.verified,
                locked: p.locked,
                updated: p.metricsUpdatedAt ? formatIst(p.metricsUpdatedAt) : "—",
                subLink: postUrl(origin, a.code, p.id),
              }))}
            />
          </section>
        </>
      ) : (
        <p className="muted">You can add posts once you&apos;re approved.</p>
      )}
    </main>
  );
}
