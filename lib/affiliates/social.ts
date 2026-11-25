import { InputError } from "@/lib/admin/validate";

const HOSTS: Record<string, string[]> = {
  instagram: ["instagram.com", "www.instagram.com", "m.instagram.com"],
  tiktok: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"],
  x: ["x.com", "twitter.com", "www.x.com", "www.twitter.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
};

export const POST_PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "x", "linkedin"] as const;

export function platformOf(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const [platform, hosts] of Object.entries(HOSTS)) if (hosts.includes(host)) return platform;
  } catch {
    // ignore
  }
  return null;
}

/** https URL on one of the allowed hosts; returns the cleaned URL or null when empty. */
export function socialUrl(value: unknown, label: string, allowed: string[]) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new InputError(`${label} is not a valid link.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new InputError(`${label} is not a valid link.`);
  const platform = platformOf(url.toString());
  if (!platform || !allowed.includes(platform)) throw new InputError(`${label} must be a ${allowed.join(" or ")} link.`);
  url.protocol = "https:";
  url.hash = "";
  const out = url.toString();
  if (out.length > 300) throw new InputError(`${label} is too long.`);
  return out;
}
