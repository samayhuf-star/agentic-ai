/** Classify a user agent. Shared by server (stored on orders) and client (in-app browser prompt). */
export type InAppKind = "google" | "instagram" | "facebook" | "linkedin" | "snapchat" | "twitter" | "webview" | null;

export function inAppKind(ua: string | null | undefined): InAppKind {
  const s = ua || "";
  if (/Instagram/i.test(s)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(s)) return "facebook";
  if (/LinkedInApp/i.test(s)) return "linkedin";
  if (/Snapchat/i.test(s)) return "snapchat";
  if (/Twitter|TwitterAndroid/i.test(s)) return "twitter";
  if (/\bGSA\//.test(s)) return "google";
  if (/Android.*;\s*wv\)/i.test(s)) return "webview";
  return null;
}

export function osOf(ua: string | null | undefined): "android" | "ios" | "other" {
  const s = ua || "";
  if (/Android/i.test(s)) return "android";
  if (/iPhone|iPad|iPod/i.test(s)) return "ios";
  return "other";
}

/** Short label like "mobile/android/instagram-app" or "desktop/other". */
export function deviceLabel(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const os = osOf(ua);
  const mobile = os !== "other" || /Mobi/i.test(ua);
  const app = inAppKind(ua);
  return [mobile ? "mobile" : "desktop", os, app ? `${app}-app` : "browser"].join("/");
}

/** In-app browsers where UPI intent usually fails. Don't auto-open Cashfree; show Open in Chrome first. */
export function shouldHoldCashfreeHandoff(kind: InAppKind) {
  return kind === "instagram" || kind === "facebook" || kind === "snapchat";
}
