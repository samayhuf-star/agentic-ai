import type { MetadataRoute } from "next";

const BASE = "https://www.theaitimemachine.com";
const PAGES = ["", "/55-ai-agents", "/pricing", "/about", "/contact", "/privacy", "/terms", "/refund-policy", "/shipping-policy", "/cookie-policy", "/disclaimer"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `${BASE}${path}`, changeFrequency: "weekly", priority: path === "" || path === "/55-ai-agents" ? 1 : 0.5 }));
}
