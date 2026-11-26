import { composeAgentDoc } from "@/lib/agent-types/compose";
import { agentPage, allAgentPages } from "@/lib/agent-types/data";
import { agentDocMarkdown } from "@/lib/agent-types/markdown";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return allAgentPages().map((page) => ({ slug: page.slug }));
}

/** Served at /ai-agents/<slug>.md through a rewrite in next.config.mjs. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = agentPage(slug);
  if (!page) return new Response("Not found", { status: 404 });
  return new Response(agentDocMarkdown(composeAgentDoc(page)), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      link: `<${siteUrl(page.path)}>; rel="canonical"`,
      "x-robots-tag": "noindex, follow",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
