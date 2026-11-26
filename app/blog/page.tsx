import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";
import { allPosts } from "@/content/blog";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta(
  "Blog",
  "Practical writing on AI agents, approval-first automation, and everyday work for small businesses.",
  "/blog",
);

export default function BlogIndexPage() {
  const posts = allPosts();
  return (
    <PageShell crumbs={[{ name: "Blog", path: "/blog" }]}>
      <p className="mk-kicker">Journal</p>
      <h1>Notes on AI agents and everyday work</h1>
      <p className="mk-lead">Longer pieces on how to use agents carefully: drafts first, a clear yes, and no invented promises. Written for owners, not for a hype cycle.</p>
      <div className="mk-grid" style={{ marginTop: 36 }}>
        {posts.map((post) => (
          <Link className="mk-card" key={post.slug} href={`/blog/${post.slug}`}>
            <img className="mk-hero-img" src={post.hero} alt="" style={{ margin: "0 0 14px", borderRadius: 12 }} />
            <small>{post.kicker}</small>
            <h2>{post.title}</h2>
            <p>{post.description}</p>
            <span className="mk-more">{new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {Math.max(1, Math.round(post.words / 200))} min read</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
