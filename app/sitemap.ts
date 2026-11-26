import type { MetadataRoute } from "next";
import { publicPages } from "@/lib/public-pages";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages().map((path) => ({
    url: path === "/" ? SITE.url : `${SITE.url}${path}`,
    changeFrequency: path === "/" || path === "/55-ai-agents" || path === "/us" || path === "/us/55-ai-agents" || path.startsWith("/blog") ? "weekly" : "monthly",
    priority: path === "/" || path === "/55-ai-agents" || path === "/us" || path === "/us/55-ai-agents" ? 1 : path.startsWith("/blog/") ? 0.7 : 0.5,
  }));
}
