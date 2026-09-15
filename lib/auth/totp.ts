import crypto from "node:crypto";
import { generateSecret, generateURI, verify as verifyOtp } from "otplib";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildTotpUri(secret: string, email: string): string {
  return generateURI({ issuer: "Kitab Link", label: email, secret });
}

export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const trimmed = code.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(trimmed)) return false;
  // epochTolerance 30s (1 time-step) -- toleransi clock drift wajar antara server & HP,
  // tanpa ini kode yang "baru aja ganti" pas user ngetik sering ketolak gara-gara telat 1-2 detik.
  const result = await verifyOtp({ secret, token: trimmed, epochTolerance: 30 });
  return result.valid;
}

const BACKUP_CODE_COUNT = 10;

// 10 hex char per kode (5 byte random) -- cukup panjang buat gak ketebak, cukup pendek buat
// ditulis tangan/disimpen manual kalau HP authenticator-nya ilang.
export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => crypto.randomBytes(5).toString("hex"));
}

// SHA-256 biasa (bukan Argon2id lewat hashPassword) -- backup code itu string RANDOM
// bikinan sistem (40 bit, bukan password bikinan manusia), sama kelasnya kayak API token
// (lihat lib/auth/api-tokens.ts). Argon2id di sini cuma nambah beban CPU/memory (19 MiB x
// sampai 10 percobaan tiap submit) tanpa nambah keamanan riil, karena entropinya udah dari
// randomBytes, bukan dari hash-nya.
function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return codes.map(hashBackupCode);
}

// Cocokin submitted code ke salah satu hash, kalau ketemu balikin array SISA (kode yang
// dipakai dibuang -- sekali pakai). null = gak ada yang cocok.
export async function consumeBackupCode(hashedCodes: string[], submitted: string): Promise<string[] | null> {
  const target = hashBackupCode(submitted.trim().toLowerCase());
  const index = hashedCodes.findIndex((hash) => hash === target);
  if (index === -1) return null;
  return [...hashedCodes.slice(0, index), ...hashedCodes.slice(index + 1)];
}
