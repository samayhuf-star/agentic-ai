import { notFound } from "next/navigation";
import { JsonLd } from "@/components/marketing/JsonLd";
import { PageShell } from "@/components/marketing/PageShell";
import { allPosts, postBySlug } from "@/content/blog";
import { renderMarkdown } from "@/lib/markdown";
import { articleJsonLd, pageMeta, SITE } from "@/lib/site";

export function generateStaticParams() {
  return allPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then((p) => {
    const post = postBySlug(p.slug);
    if (!post) return {};
    return pageMeta(post.title, post.description, `/blog/${post.slug}`, post.hero);
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();
  const published = new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const minutes = Math.max(1, Math.round(post.words / 200));
  return (
    <PageShell crumbs={[{ name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${post.slug}` }]}>
      <JsonLd data={articleJsonLd({ title: post.title, description: post.description, path: `/blog/${post.slug}`, datePublished: post.date, dateModified: post.updated || post.date, image: post.hero })} />
      <p className="mk-kicker">{post.kicker}</p>
      <h1>{post.title}</h1>
      <p className="mk-byline">
        By {SITE.founder}, {SITE.founderRole} · {published} · {minutes} min read
      </p>
      <img className="mk-hero-img" src={post.hero} alt="" />
      <div className="mk-prose mk-blog-hero">{renderMarkdown(post.body)}</div>
    </PageShell>
  );
}
