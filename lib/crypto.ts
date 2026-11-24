import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { authSecret } from "@/lib/config";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashSecret(value: string) {
  const pepper = authSecret();
  if (!pepper) throw new Error("AUTH_SECRET is missing.");
  return sha256(`${pepper}:${value}`);
}

export function randomToken() {
  return randomBytes(24).toString("hex");
}

export function sixDigitCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hmacHex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function hmacBase64(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("base64");
}
