import type { MetadataRoute } from "next";

const PRIVATE = ["/dashboard", "/sup-admin", "/admin", "/api/", "/onboarding", "/checkout/", "/payment/", "/welcome", "/unsubscribe", "/partner/", "/r/"];

/** Search and AI crawlers we explicitly welcome on public pages (private areas stay blocked for everyone). */
const AI_AND_SEARCH_BOTS = [
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "DuckDuckBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_AND_SEARCH_BOTS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
      { userAgent: "*", allow: "/", disallow: PRIVATE },
    ],
    sitemap: ["https://www.theaitimemachine.com/sitemap.xml", "https://www.theaitimemachine.com/ai-agents/sitemap.xml"],
  };
}
