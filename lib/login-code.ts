/** Shared sign-in / payment-receipt code rules. The admin PIN path is separate and unchanged. */
export const CODE_TTL_MS = 24 * 60 * 60 * 1000;
export const CODE_TTL_COPY = "24 hours";

export function codeFromEmailBody(body: string) {
  return body.match(/code is (\d{6})/)?.[1] || null;
}
