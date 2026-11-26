import { helpArticles } from "@/content/help";
import { allPosts } from "@/content/blog";
import { solutions } from "@/content/solutions";
import { useCases } from "@/content/use-cases";
import { agents } from "@/data/agents";

export const STATIC_PUBLIC_PAGES = [
  "/",
  "/55-ai-agents",
  "/about",
  "/agents",
  "/blog",
  "/careers",
  "/contact",
  "/cookie-policy",
  "/disclaimer",
  "/help",
  "/integrations",
  "/legal",
  "/acceptable-use",
  "/privacy-rights",
  "/partners",
  "/partners/apply",
  "/partners/terms",
  "/press",
  "/pricing",
  "/privacy",
  "/refund-policy",
  "/security",
  "/shipping-policy",
  "/sitemap",
  "/solutions",
  "/status",
  "/terms",
  "/use-cases",
] as const;

export function publicPages() {
  return [
    ...STATIC_PUBLIC_PAGES,
    ...solutions.map((item) => `/solutions/${item.slug}`),
    ...useCases.map((item) => `/use-cases/${item.slug}`),
    ...helpArticles.map((item) => `/help/${item.slug}`),
    ...agents.map((item) => `/agents/${item.id}`),
    ...allPosts().map((item) => `/blog/${item.slug}`),
  ];
}
