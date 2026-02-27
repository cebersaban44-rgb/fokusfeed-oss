import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKeyBytes(encryptionKey: string): Buffer {
  return createHash("sha256").update(encryptionKey).digest();
}

export function encryptValue(plainText: string, encryptionKey: string): string {
  const iv = randomBytes(12);
  const key = getKeyBytes(encryptionKey);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptValue(cipherText: string, encryptionKey: string): string {
  const [ivB64, tagB64, dataB64] = cipherText.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const key = getKeyBytes(encryptionKey);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

export function fingerprintSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
