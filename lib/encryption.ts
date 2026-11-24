import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export class MissingEncryptionKey extends Error {
  constructor() {
    super("Saving a key needs ENCRYPTION_KEY on the server. Ask the site owner to set it.");
    this.name = "MissingEncryptionKey";
  }
}

export function encryptionKeyBytes() {
  const raw = process.env.ENCRYPTION_KEY?.trim() || "";
  if (!raw) throw new MissingEncryptionKey();
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const asBase64 = Buffer.from(raw, "base64");
  const roundTrip = asBase64.toString("base64").replace(/=+$/, "") === raw.replace(/=+$/, "");
  if (roundTrip && asBase64.length === 32) return asBase64;
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string) {
  const key = encryptionKeyBytes();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    encryptedKey: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(payload: { encryptedKey: string; iv: string; authTag: string }) {
  const key = encryptionKeyBytes();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(payload.encryptedKey, "base64")), decipher.final()]);
  return plain.toString("utf8");
}
