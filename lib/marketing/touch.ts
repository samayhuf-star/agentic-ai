// Edge-safe (used by middleware). No Node imports here.

export const MT_COOKIE = "aitm_mt";
export const MT_DAYS = 90;

/** One visit's marketing signal. Short keys keep the cookie small. */
export type Touch = {
  s?: string; // utm_source
  m?: string; // utm_medium
  c?: string; // utm_campaign
  t?: string; // utm_term
  n?: string; // utm_content
  g?: string; // gclid
  f?: string; // fbclid
  k?: string; // ttclid
  a?: string; // affiliate ref code
  p?: string; // landing path
  r?: string; // external referrer (host + path)
  at: number; // unix seconds
};

export type MarketingCookie = { f: Touch; l: Touch };

const clip = (v: string | null | undefined, max = 100) => {
  const s = (v || "").trim();
  return s ? s.slice(0, max) : undefined;
};

/** Reads the marketing signal on a page request. Returns null for an internal navigation with no signal. */
export function touchFromRequest(url: URL, referer: string | null, ownHosts: string[]): Touch | null {
  const q = url.searchParams;
  const touch: Touch = {
    s: clip(q.get("utm_source"))?.toLowerCase(),
    m: clip(q.get("utm_medium"))?.toLowerCase(),
    c: clip(q.get("utm_campaign")),
    t: clip(q.get("utm_term")),
    n: clip(q.get("utm_content")),
    g: clip(q.get("gclid"), 200),
    f: clip(q.get("fbclid"), 200),
    k: clip(q.get("ttclid"), 200),
    a: clip(q.get("ref"), 32)?.toUpperCase(),
    p: clip(url.pathname, 120),
    at: Math.floor(Date.now() / 1000),
  };
  if (referer) {
    try {
      const ref = new URL(referer);
      const host = ref.hostname.toLowerCase().replace(/^www\./, "");
      if (!ownHosts.some((h) => h.replace(/^www\./, "") === host)) touch.r = clip(`${host}${ref.pathname === "/" ? "" : ref.pathname}`, 120);
    } catch {
      // ignore bad referer
    }
  }
  const signal = touch.s || touch.m || touch.c || touch.g || touch.f || touch.k || touch.a || touch.r;
  for (const key of Object.keys(touch) as (keyof Touch)[]) if (touch[key] === undefined) delete touch[key];
  return signal ? touch : null;
}

export function encodeMarketing(value: MarketingCookie) {
  const json = JSON.stringify(value);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeMarketing(raw: string | null | undefined): MarketingCookie | null {
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(decodeURIComponent(escape(atob(b64)))) as MarketingCookie;
    if (!parsed || typeof parsed !== "object" || !parsed.f || !parsed.l) return null;
    return { f: sanitize(parsed.f), l: sanitize(parsed.l) };
  } catch {
    return null;
  }
}

function sanitize(t: Touch): Touch {
  const out: Touch = { at: Number(t.at) || 0 };
  for (const key of ["s", "m", "c", "t", "n", "g", "f", "k", "a", "p", "r"] as const) {
    const v = t[key];
    if (typeof v === "string" && v) out[key] = v.slice(0, key === "g" || key === "f" || key === "k" ? 200 : 120);
  }
  return out;
}

/** First touch stays for 90 days; last touch moves only when a visit carries a signal. */
export function mergeTouch(prev: MarketingCookie | null, touch: Touch | null, landingPath: string): MarketingCookie | null {
  if (prev) return touch ? { f: prev.f, l: touch } : null;
  const first = touch || { p: landingPath.slice(0, 120), at: Math.floor(Date.now() / 1000) };
  return { f: first, l: first };
}

export const CHANNELS = ["Paid Meta", "Paid Google", "Paid TikTok", "Paid other", "Affiliate", "Organic search", "Social organic", "Email", "Referral", "Direct"] as const;
export type Channel = (typeof CHANNELS)[number];

const META = /^(facebook|fb|instagram|ig|meta|messenger|audience_network)$/;
const PAID = /^(paid|cpc|ppc|cpm|paid_social|paidsocial|paid-social|ads?|display|social_paid|cpv|retargeting)$/;
const SEARCH_HOSTS = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|yahoo\.com|ecosia\.org|yandex\.[a-z]+|baidu\.com|search\.brave\.com)$/;
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|m\.facebook\.com|l\.facebook\.com|lm\.facebook\.com|instagram\.com|l\.instagram\.com|linkedin\.com|lnkd\.in|t\.co|x\.com|twitter\.com|youtube\.com|youtu\.be|tiktok\.com|reddit\.com|whatsapp\.com|wa\.me|telegram\.org|t\.me|pinterest\.[a-z.]+|quora\.com|threads\.net)$/;
const SOCIAL_SOURCES = /^(facebook|fb|instagram|ig|linkedin|twitter|x|youtube|tiktok|reddit|whatsapp|telegram|pinterest|quora|threads)$/;
const MAIL_HOSTS = /(^|\.)(mail\.google\.com|outlook\.live\.com|mail\.yahoo\.com)$/;

export function channelOf(t: Touch | null | undefined, opts: { affiliate?: boolean } = {}): Channel {
  if (opts.affiliate) return "Affiliate";
  if (!t) return "Direct";
  const s = t.s || "";
  const m = t.m || "";
  const host = (t.r || "").split("/")[0];
  if (t.f || (META.test(s) && PAID.test(m))) return "Paid Meta";
  if (t.g || (/^(google|adwords|youtube)$/.test(s) && PAID.test(m))) return "Paid Google";
  if (t.k || (s === "tiktok" && PAID.test(m))) return "Paid TikTok";
  if (t.a || m === "affiliate" || m === "partner" || m === "influencer") return "Affiliate";
  if (PAID.test(m)) return "Paid other";
  if (m === "email" || m === "newsletter" || s === "email" || s === "newsletter" || MAIL_HOSTS.test(host)) return "Email";
  if (m === "organic" && /^(google|bing|duckduckgo|yahoo)$/.test(s)) return "Organic search";
  if (!s && SEARCH_HOSTS.test(host)) return "Organic search";
  if (SOCIAL_SOURCES.test(s) || (!s && SOCIAL.test(host)) || m === "social" || m === "social_organic") return "Social organic";
  if (s || host) return "Referral";
  return "Direct";
}
