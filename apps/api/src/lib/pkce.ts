import { createHash, randomBytes } from "node:crypto";

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createCodeVerifier(length = 64): string {
  return toBase64Url(randomBytes(length));
}

export function createCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function createOAuthState(length = 24): string {
  return toBase64Url(randomBytes(length));
}
