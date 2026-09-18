import crypto from "node:crypto";

// Sama pola kayak lib/auth/setup-token.ts -- token one-time dicetak ke stdout (docker logs),
// BUKAN dikirim email, karena app ini single-user self-hosted tanpa SMTP (lihat CLAUDE.md,
// no heavy infra). Trust model-nya: siapa yang bisa baca log container = operator/pemilik
// server yang sah. Disimpen in-memory per username (bukan tabel DB) -- short-lived (15 menit)
// secara alami, restart server = token invalid, user tinggal minta baru.
const TTL_MS = 15 * 60 * 1000;

const tokens = new Map<string, { token: string; expires: number }>();

export function generateResetToken(username: string): string {
  const token = crypto.randomBytes(24).toString("hex");
  tokens.set(username, { token, expires: Date.now() + TTL_MS });
  console.log(`[kitab-link] Password reset token buat ${username} (berlaku 15 menit): ${token}`);
  return token;
}

export function verifyResetToken(username: string, token: string): boolean {
  const entry = tokens.get(username);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    tokens.delete(username);
    return false;
  }
  return entry.token === token;
}

export function consumeResetToken(username: string): void {
  tokens.delete(username);
}
