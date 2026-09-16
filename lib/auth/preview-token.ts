import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { previewTokens } from "@/lib/db/schema";

const TOKEN_PREFIX = "klp_"; // Kitab Link Preview

// Sama pola-nya kayak lib/auth/api-tokens.ts -- token high-entropy, hash SHA-256 biasa
// (bukan bcrypt/argon2, bukan password manusia).
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Replace, bukan nambah -- 1 userId cuma boleh punya 1 preview token aktif (kolom
// userId unique). Generate ulang otomatis nge-invalidate link lama.
export async function regeneratePreviewToken(userId: number): Promise<string> {
  const raw = `${TOKEN_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
  await db
    .insert(previewTokens)
    .values({ userId, tokenHash: hashToken(raw) })
    .onConflictDoUpdate({ target: previewTokens.userId, set: { tokenHash: hashToken(raw) } });
  return raw;
}

export async function revokePreviewToken(userId: number): Promise<void> {
  await db.delete(previewTokens).where(eq(previewTokens.userId, userId));
}

export async function hasActivePreviewToken(userId: number): Promise<boolean> {
  const [row] = await db.select({ id: previewTokens.id }).from(previewTokens).where(eq(previewTokens.userId, userId)).limit(1);
  return !!row;
}

// Dipanggil pas orang buka link share-nya (app/dashboard/preview/[token]/route.ts).
export async function verifyPreviewToken(rawToken: string): Promise<{ userId: number; tokenId: number } | null> {
  if (!rawToken.startsWith(TOKEN_PREFIX)) return null;

  const [row] = await db.select().from(previewTokens).where(eq(previewTokens.tokenHash, hashToken(rawToken))).limit(1);
  if (!row) return null;
  return { userId: row.userId, tokenId: row.id };
}

// Dipanggil TIAP REQUEST session preview buat mastiin token belum di-revoke (bukan cuma
// baca dari cookie yang udah ditandatangani -- revoke harus langsung berlaku, gak nunggu
// cookie expire sendiri).
export async function isPreviewTokenStillValid(userId: number, tokenId: number): Promise<boolean> {
  const [row] = await db.select({ id: previewTokens.id }).from(previewTokens).where(eq(previewTokens.userId, userId)).limit(1);
  return row?.id === tokenId;
}
