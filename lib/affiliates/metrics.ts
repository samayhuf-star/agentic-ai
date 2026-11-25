import { InputError } from "@/lib/admin/validate";

/**
 * Where post metrics come from. Today only "manual" exists: the creator or an admin types the numbers.
 * We do not scrape Instagram or TikTok. When an official API is connected, add a provider here
 * (e.g. id "api:instagram") and call refreshPostMetrics from a cron job; posts keep metricsSource
 * so manual and API numbers never get mixed up, and locked posts are never overwritten.
 */
export type PostMetrics = { views: number; likes: number; comments: number; shares: number };

export interface MetricsProvider {
  id: string;
  supports(platform: string): boolean;
  fetch(url: string): Promise<PostMetrics | null>;
}

export const METRICS_PROVIDERS: MetricsProvider[] = [];

export function providerFor(platform: string) {
  return METRICS_PROVIDERS.find((p) => p.supports(platform)) || null;
}

export function readMetrics(body: Record<string, unknown>) {
  const out: Partial<PostMetrics> = {};
  for (const key of ["views", "likes", "comments", "shares"] as const) {
    if (!(key in body)) continue;
    const n = Number(String(body[key] ?? "").replace(/[,\s]/g, ""));
    if (!Number.isInteger(n) || n < 0 || n > 2_000_000_000) throw new InputError(`${key} must be a whole number of 0 or more.`);
    out[key] = n;
  }
  return out;
}
