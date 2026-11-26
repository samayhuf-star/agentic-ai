import type { MetadataRoute } from "next";
import { AGENT_TYPES_UPDATED, allAgentPages, categoriesWithPages } from "@/lib/agent-types/data";
import { siteUrl } from "@/lib/site";

/** Served at /ai-agents/sitemap.xml. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${AGENT_TYPES_UPDATED}T00:00:00Z`);
  return [
    { url: siteUrl("/ai-agents"), lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...categoriesWithPages().map((cat) => ({ url: siteUrl(`/ai-agents/category/${cat.id}`), lastModified, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...allAgentPages().map((page) => ({ url: siteUrl(page.path), lastModified, changeFrequency: "monthly" as const, priority: page.kind === "function" ? 0.7 : 0.6 })),
  ];
}
