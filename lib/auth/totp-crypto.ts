import crypto from "node:crypto";
import { deriveKey } from "@/lib/auth/master-secret";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// TOTP secret disimpen ENCRYPTED (bukan hashed) karena beda dari password -- server perlu
// bisa DECRYPT lagi buat generate/verify OTP code tiap login, gak bisa one-way hash. Key-nya
// di-derive dari master secret (lib/auth/master-secret.ts), bukan disimpen terpisah -- kalau
// master secret ilang, session + TOTP dua-duanya invalid bareng (konsisten, satu sumber
// kebenaran, bukan dua secret terpisah yang perlu di-backup masing-masing).
function getKey(): Buffer {
  return deriveKey("totp-secret", 32);
}

export function encryptTotpSecret(plainSecret: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainSecret, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptTotpSecret(encrypted: string): string {
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
