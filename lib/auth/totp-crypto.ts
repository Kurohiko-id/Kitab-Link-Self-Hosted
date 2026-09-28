import crypto from "node:crypto";
import { deriveKey } from "@/lib/auth/master-secret";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// Secret yang server perlu bisa DECRYPT lagi (bukan hash satu arah kayak password) --
// TOTP secret (generate/verify OTP tiap login) dan API key YouTube (dipakai cron). Key
// AES-nya di-derive dari master secret (lib/auth/master-secret.ts) per `purpose`, bukan
// disimpen terpisah -- kalau master secret ilang, semuanya invalid bareng (konsisten,
// satu sumber kebenaran, bukan beberapa secret terpisah yang perlu di-backup masing-masing).
// Format hasil: base64(iv[12] + authTag[16] + ciphertext).
export function encryptSecret(purpose: string, plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(purpose, 32), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptSecret(purpose: string, encrypted: string): string {
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(purpose, 32), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function encryptTotpSecret(plainSecret: string): string {
  return encryptSecret("totp-secret", plainSecret);
}

export function decryptTotpSecret(encrypted: string): string {
  return decryptSecret("totp-secret", encrypted);
}
