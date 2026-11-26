import fs from "node:fs";
import path from "node:path";
import { wordCount } from "@/lib/markdown";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  kicker: string;
  hero: string;
  images: string[];
  body: string;
  words: number;
};

const DIR = path.join(process.cwd(), "content/blog");

function parseFrontMatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Blog post is missing front matter.");
  const meta: Record<string, string | string[]> = {};
  const lines = match[1].split("\n");
  let listKey: string | null = null;
  for (const line of lines) {
    const list = line.match(/^(\w+):\s*$/);
    if (list) {
      listKey = list[1];
      meta[listKey] = [];
      continue;
    }
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      (meta[listKey] as string[]).push(item[1].trim());
      continue;
    }
    listKey = null;
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: match[2].trim() };
}

function readPost(file: string): BlogPost {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const { meta, body } = parseFrontMatter(raw);
  const slug = String(meta.slug || file.replace(/\.md$/, ""));
  const images = Array.isArray(meta.images) ? meta.images : [];
  return {
    slug,
    title: String(meta.title || ""),
    description: String(meta.description || ""),
    date: String(meta.date || ""),
    updated: meta.updated ? String(meta.updated) : undefined,
    kicker: String(meta.kicker || "Journal"),
    hero: String(meta.hero || `/blog/${slug}-hero.webp`),
    images,
    body,
    words: wordCount(body),
  };
}

export function allPosts(): BlogPost[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((file) => file.endsWith(".md"))
    .map(readPost)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function postBySlug(slug: string) {
  return allPosts().find((post) => post.slug === slug);
}
