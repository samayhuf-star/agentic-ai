import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { allPosts } from "../content/blog";
import { helpArticles } from "../content/help";
import { solutions } from "../content/solutions";
import { useCases } from "../content/use-cases";
import { agents } from "../data/agents";
import { publicPages } from "../lib/public-pages";

test("the journal has at least twelve long posts", () => {
  const posts = allPosts();
  assert.ok(posts.length >= 12, `only ${posts.length} posts`);
  assert.equal(new Set(posts.map((post) => post.slug)).size, posts.length);
  for (const post of posts) {
    assert.ok(post.words >= 1200, `${post.slug} is ${post.words} words`);
    assert.ok(post.title && post.description && post.date && post.hero);
    const hero = path.join(process.cwd(), "public", post.hero.replace(/^\//, ""));
    assert.ok(fs.existsSync(hero), `missing ${post.hero}`);
    for (const image of post.images) {
      assert.ok(fs.existsSync(path.join(process.cwd(), "public", image.replace(/^\//, ""))), `missing ${image}`);
    }
    assert.match(post.body, /!\[/);
  }
});

test("public pages include the new marketing routes and every agent", () => {
  const pages = publicPages();
  for (const needed of [
    "/",
    "/about",
    "/agents",
    "/blog",
    "/careers",
    "/contact",
    "/help",
    "/integrations",
    "/legal",
    "/acceptable-use",
    "/privacy-rights",
    "/partners",
    "/press",
    "/pricing",
    "/security",
    "/sitemap",
    "/solutions",
    "/status",
    "/use-cases",
  ]) {
    assert.ok(pages.includes(needed), needed);
  }
  assert.equal(pages.filter((page) => page.startsWith("/agents/")).length, agents.length);
  assert.equal(pages.filter((page) => page.startsWith("/solutions/")).length, solutions.length);
  assert.equal(pages.filter((page) => page.startsWith("/use-cases/")).length, useCases.length);
  assert.equal(pages.filter((page) => page.startsWith("/help/")).length, helpArticles.length);
  assert.equal(pages.filter((page) => page.startsWith("/blog/")).length, allPosts().length);
});

test("marketing copy does not invent social proof", () => {
  const roots = ["content", "app/about", "app/press", "app/careers", "app/integrations", "app/security"];
  const files: string[] = [];
  for (const root of roots) {
    const dir = path.join(process.cwd(), root);
    if (!fs.existsSync(dir)) continue;
    const walk = (d: string) => {
      for (const name of fs.readdirSync(d)) {
        const full = path.join(d, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx|md)$/.test(name)) files.push(full);
      }
    };
    walk(dir);
  }
  const joined = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(joined, /as seen in|trusted by \d+|certified ISO|SOC 2 certified/i);
  assert.match(joined, /We do not currently hold SOC 2/);
});
