import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";

const TOKEN_PREFIX = "klk_"; // Kitab Link Key

// Token API bukan password (entropi tinggi, dibuat sistem), jadi cukup di-hash
// pakai SHA-256 biasa (fast lookup by hash) — bukan bcrypt yang sengaja lambat.
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createApiToken(userId: number, name: string, scopes: string[]) {
  const raw = `${TOKEN_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
  const [created] = await db
    .insert(apiTokens)
    .values({
      userId,
      name: name.trim() || "Untitled token",
      tokenHash: hashToken(raw),
      scopesJson: JSON.stringify(scopes),
    })
    .returning();

  // Raw token cuma pernah ada di sini — setelah ini cuma hash yang tersimpan.
  return { id: created.id, token: raw };
}

export async function verifyApiToken(
  rawToken: string,
): Promise<{ userId: number; scopes: string[] } | null> {
  if (!rawToken.startsWith(TOKEN_PREFIX)) return null;

  const [row] = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, hashToken(rawToken)))
    .limit(1);

  if (!row) return null;
  return { userId: row.userId, scopes: JSON.parse(row.scopesJson) as string[] };
}
