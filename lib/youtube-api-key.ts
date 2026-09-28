import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, users } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/auth/totp-crypto";

const PURPOSE = "youtube-api-key";

export function encryptYoutubeApiKey(plain: string): string {
  return encryptSecret(PURPOSE, plain);
}

// Key milik OWNER page-nya (lewat pages.userId), bukan "user pertama" -- live badge &
// scheduled rule nyimpen pageId, bukan userId. Decrypt gagal (mis. restore DB ke instance
// dengan master secret beda) -> null, jatuh ke scraping, bukan crash cron.
export async function getYoutubeApiKeyForPage(pageId: number): Promise<string | null> {
  const [row] = await db
    .select({ key: users.youtubeApiKey })
    .from(pages)
    .innerJoin(users, eq(pages.userId, users.id))
    .where(eq(pages.id, pageId))
    .limit(1);
  if (!row?.key) return null;
  try {
    return decryptSecret(PURPOSE, row.key);
  } catch {
    return null;
  }
}
