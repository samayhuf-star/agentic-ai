import { notFound } from "next/navigation";
import { PageShell } from "@/components/marketing/PageShell";
import { helpArticles, helpBySlug } from "@/content/help";
import { renderMarkdown } from "@/lib/markdown";
import { pageMeta } from "@/lib/site";

export function generateStaticParams() {
  return helpArticles.map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then((p) => {
    const item = helpBySlug(p.slug);
    if (!item) return {};
    return pageMeta(item.title, item.description, `/help/${item.slug}`);
  });
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = helpBySlug(slug);
  if (!item) notFound();
  return (
    <PageShell crumbs={[{ name: "Help centre", path: "/help" }, { name: item.title, path: `/help/${item.slug}` }]}>
      <p className="mk-kicker">Help</p>
      <h1>{item.title}</h1>
      <p className="mk-lead">{item.description}</p>
      <div className="mk-prose" style={{ marginTop: 28 }}>
        {renderMarkdown(item.body)}
      </div>
    </PageShell>
  );
}
