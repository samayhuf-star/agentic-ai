import * as v from "@/lib/admin/validate";
import { platformOf, POST_PLATFORMS, socialUrl } from "@/lib/affiliates/social";

const ALLOWED = POST_PLATFORMS.filter((p) => p !== "linkedin" && p !== "x");

export function readNewPost(body: Record<string, unknown>) {
  const url = socialUrl(body.url, "Post link", [...ALLOWED]);
  if (!url) throw new v.InputError("Paste the post link.");
  return {
    url,
    platform: platformOf(url) || "other",
    title: v.text(body.title, "Title", 120),
    postedAt: v.date(body.postedAt, "Posted on"),
  };
}

export const MAX_POSTS = 300;
