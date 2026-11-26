// Edge-safe (used by middleware). No Node imports here.

export const MT_COOKIE = "aitm_mt";
export const VID_COOKIE = "aitm_vid";
export const MT_DAYS = 90;
export const VID_DAYS = 365;

/** One visit's marketing signal. Short keys keep the cookie small. */
export type Touch = {
  s?: string; // utm_source
  m?: string; // utm_medium
  c?: string; // utm_campaign
  t?: string; // utm_term
  n?: string; // utm_content
  g?: string; // gclid
  gb?: string; // gbraid
  w?: string; // wbraid
  f?: string; // fbclid
  k?: string; // ttclid
  l?: string; // li_fat_id
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
    gb: clip(q.get("gbraid"), 200),
    w: clip(q.get("wbraid"), 200),
    f: clip(q.get("fbclid"), 200),
    k: clip(q.get("ttclid"), 200),
    l: clip(q.get("li_fat_id"), 200),
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
  const signal = touch.s || touch.m || touch.c || touch.g || touch.gb || touch.w || touch.f || touch.k || touch.l || touch.a || touch.r;
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
  for (const key of ["s", "m", "c", "t", "n", "g", "gb", "w", "f", "k", "l", "a", "p", "r"] as const) {
    const v = t[key];
    const max = key === "g" || key === "gb" || key === "w" || key === "f" || key === "k" || key === "l" ? 200 : 120;
    if (typeof v === "string" && v) out[key] = v.slice(0, max);
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

function hostOf(t: Touch | null | undefined) {
  return (t?.r || "").split("/")[0].toLowerCase().replace(/^www\./, "");
}

export function channelOf(t: Touch | null | undefined, opts: { affiliate?: boolean } = {}): Channel {
  if (opts.affiliate) return "Affiliate";
  if (!t) return "Direct";
  const s = t.s || "";
  const m = t.m || "";
  const host = hostOf(t);
  if (t.f || (META.test(s) && PAID.test(m))) return "Paid Meta";
  if (t.g || t.gb || t.w || (/^(google|adwords|youtube)$/.test(s) && PAID.test(m))) return "Paid Google";
  if (t.k || (s === "tiktok" && PAID.test(m))) return "Paid TikTok";
  if (t.l || (s === "linkedin" && PAID.test(m))) return "Paid other";
  if (t.a || m === "affiliate" || m === "partner" || m === "influencer") return "Affiliate";
  if (PAID.test(m)) return "Paid other";
  if (m === "email" || m === "newsletter" || s === "email" || s === "newsletter" || MAIL_HOSTS.test(host)) return "Email";
  if (m === "organic" && /^(google|bing|duckduckgo|yahoo)$/.test(s)) return "Organic search";
  if (!s && SEARCH_HOSTS.test(host)) return "Organic search";
  if (SOCIAL_SOURCES.test(s) || (!s && SOCIAL.test(host)) || m === "social" || m === "social_organic") return "Social organic";
  if (s || host) return "Referral";
  return "Direct";
}

const IG = /^(ig|instagram)$/;
const FB = /^(facebook|fb|meta|messenger|audience_network)$/;

function isInstagram(t: Touch) {
  const host = hostOf(t);
  return IG.test(t.s || "") || /(^|\.)(instagram\.com|l\.instagram\.com)$/.test(host);
}

function isFacebook(t: Touch) {
  const host = hostOf(t);
  return FB.test(t.s || "") || /(^|\.)(facebook\.com|fb\.com|m\.facebook\.com|l\.facebook\.com|lm\.facebook\.com)$/.test(host);
}

/** Specific traffic source for the admin Sources view (Instagram Ads, Google organic, …). */
export function sourceOf(t: Touch | null | undefined, opts: { affiliate?: boolean; absent?: "Unknown" | "Direct" } = {}): string {
  if (!t) return opts.absent ?? "Unknown";
  const s = (t.s || "").toLowerCase();
  const m = (t.m || "").toLowerCase();
  const host = hostOf(t);
  if (opts.affiliate) return t.a ? `Affiliate (${t.a})` : "Affiliate";
  if (t.g || t.gb || t.w || ((/^(google|adwords)$/.test(s) || s === "youtube") && PAID.test(m))) return "Google Ads";
  if (t.k || (s === "tiktok" && PAID.test(m))) return "TikTok Ads";
  if (t.l || (s === "linkedin" && PAID.test(m))) return "LinkedIn Ads";
  if (t.f || (META.test(s) && PAID.test(m))) {
    if (isInstagram(t) || IG.test(s)) return "Instagram Ads";
    return "Facebook Ads";
  }
  if (t.a || m === "affiliate" || m === "partner" || m === "influencer") return t.a ? `Affiliate (${t.a})` : "Affiliate";
  if (PAID.test(m)) return s ? `Paid (${s})` : "Paid other";
  if (m === "email" || m === "newsletter" || s === "email" || s === "newsletter" || MAIL_HOSTS.test(host)) return "Email";
  if ((m === "organic" && /^(google|bing|duckduckgo|yahoo)$/.test(s)) || (!s && SEARCH_HOSTS.test(host))) {
    if (s === "bing" || host.includes("bing.com")) return "Bing";
    if (s === "duckduckgo" || host.includes("duckduckgo")) return "DuckDuckGo";
    if (s === "yahoo" || host.includes("yahoo")) return "Yahoo";
    return "Google organic";
  }
  if (isInstagram(t) || IG.test(s)) return "Instagram organic";
  if (isFacebook(t) || FB.test(s)) return "Facebook organic";
  if (s === "youtube" || /(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return "YouTube";
  if (s === "linkedin" || /(^|\.)(linkedin\.com|lnkd\.in)$/.test(host)) return "LinkedIn";
  if (/^(x|twitter)$/.test(s) || /(^|\.)(x\.com|twitter\.com|t\.co)$/.test(host)) return "X";
  if (s === "whatsapp" || /(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return "WhatsApp";
  if (s === "tiktok" || /(^|\.)tiktok\.com$/.test(host)) return "TikTok organic";
  if (s || host) return s ? s : "Other";
  return "Direct";
}

/** Label for a stored payment or user. Null marketing data on older orders is Unknown, not Direct. */
export function sourceFromStored(mkt: unknown, channel?: string | null, opts: { affiliate?: boolean } = {}): string {
  if (mkt && typeof mkt === "object") {
    const touch = sanitize(mkt as Touch);
    const has = touch.s || touch.m || touch.c || touch.g || touch.gb || touch.w || touch.f || touch.k || touch.l || touch.a || touch.r;
    if (has) return sourceOf(touch, opts);
    if (touch.p || touch.at) return "Direct";
  }
  if (channel) {
    if (channel === "Paid Google") return "Google Ads";
    if (channel === "Paid Meta") return "Facebook Ads";
    if (channel === "Paid TikTok") return "TikTok Ads";
    if (channel === "Organic search") return "Google organic";
    if (channel === "Direct") return "Direct";
    return channel;
  }
  return "Unknown";
}

export function isValidVisitorId(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{16,80}$/.test(value));
}

export function newVisitorId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Path stored on MarketingVisit is the pathname only; query is applied to the marketing cookie. */
export function splitPathQuery(raw: string) {
  const text = (raw || "").trim();
  if (!text.startsWith("/")) return { pathname: "/", search: "" };
  const cut = text.slice(0, 400);
  const q = cut.indexOf("?");
  if (q < 0) return { pathname: cut.slice(0, 200) || "/", search: "" };
  return { pathname: cut.slice(0, q).slice(0, 200) || "/", search: cut.slice(q) };
}

export function marketingCookieOptions(host: string, secure: boolean, maxAge = MT_DAYS * 86400) {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure,
    maxAge,
    ...(host.endsWith("theaitimemachine.com") ? { domain: ".theaitimemachine.com" } : {}),
  };
}
