import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveBadges } from "@/lib/db/schema";
import { checkYoutubeLive } from "@/lib/youtube-live";

// Dipanggil cron tiap ~2 menit (lihat instrumentation.ts) -- SENGAJA terpisah dari
// processScheduledRules (lib/scheduled-rules.ts), badge "sedang live" gak ada hubungan
// sama toggle visibility group/link.
export async function processLiveBadges(): Promise<void> {
  const rows = await db.select().from(liveBadges);

  for (const row of rows) {
    const status = await checkYoutubeLive(row.channelUrl);
    if (status === null) continue; // gagal cek (network error dll) — coba lagi tick berikutnya

    const wentLive = status.isLive && !row.isLive;
    const now = new Date();
    await db
      .update(liveBadges)
      .set({
        isLive: status.isLive,
        videoUrl: status.videoUrl,
        lastCheckedAt: now,
        ...(wentLive ? { lastLiveAt: now } : {}),
      })
      .where(eq(liveBadges.id, row.id));
  }
}
