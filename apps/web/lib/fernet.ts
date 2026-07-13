// Fernet-Verschlüsselung (kompatibel mit Python `cryptography.fernet`).
// Wird server-seitig genutzt, um BYOK-API-Keys zu verschlüsseln.
import crypto from "crypto";

export function fernetEncrypt(key: string, plaintext: string): string {
  const k = Buffer.from(key, "base64url");
  if (k.length !== 32) throw new Error("APP_ENCRYPTION_KEY ungültig");
  const signKey = k.subarray(0, 16);
  const encKey = k.subarray(16);
  const iv = crypto.randomBytes(16);
  const ts = Buffer.alloc(8);
  ts.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)));
  const cipher = crypto.createCipheriv("aes-128-cbc", encKey, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const body = Buffer.concat([Buffer.from([0x80]), ts, iv, ct]);
  const hmac = crypto.createHmac("sha256", signKey).update(body).digest();
  const token = Buffer.concat([body, hmac]).toString("base64url");
  // Python's urlsafe_b64decode erwartet Padding:
  return token + "=".repeat((4 - (token.length % 4)) % 4);
}
