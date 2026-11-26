/** Microsoft Clarity: landing, checkout and payment-return pages only. */

export const CLARITY_PROJECT_ID = (process.env.NEXT_PUBLIC_CLARITY_ID || "").trim();

const ALLOW = [
  /^\/$/,
  /^\/55-ai-agents(?:\/|$|\?)/,
  /^\/us\/?$/,
  /^\/us\/55-ai-agents(?:\/|$|\?)/,
  /^\/us\/checkout(?:\/|$|\?)/,
  /^\/checkout(?:\/|$|\?)/,
  /^\/payment\/success(?:\/|$|\?)/,
  /^\/pricing(?:\/|$|\?)/,
];

export function isClarityPath(pathname: string) {
  const path = (pathname || "/").split("?")[0] || "/";
  return ALLOW.some((rule) => rule.test(path));
}

export function readClaritySessionId(value: unknown) {
  const id = String(value || "").trim();
  if (!id || id.length < 6 || id.length > 80 || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return id;
}

export function clarityPlayerUrl(sessionId: string | null | undefined) {
  const sid = readClaritySessionId(sessionId);
  if (!sid) return null;
  if (CLARITY_PROJECT_ID) return `https://clarity.microsoft.com/player/${encodeURIComponent(CLARITY_PROJECT_ID)}/${encodeURIComponent(sid)}`;
  return null;
}
