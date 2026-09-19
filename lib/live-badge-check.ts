import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveBadges } from "@/lib/db/schema";
import { checkYoutubeLive } from "@/lib/youtube-live";

type LiveBadgeRow = typeof liveBadges.$inferSelect;

// Dipake cron (processLiveBadges, tiap ~2 menit) DAN tombol "Refresh Status" manual
// (live-badge-actions.ts) -- satu sumber logic, biar dua jalur itu gak pernah beda hasil.
// Return status abis update, null kalau gagal cek (network error dll, caller boleh diemin).
export async function checkAndUpdateLiveBadge(row: LiveBadgeRow) {
  const status = await checkYoutubeLive(row.channelUrl);
  if (status === null) return null;

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

  return status;
}

// Dipanggil cron tiap ~2 menit (lihat instrumentation.ts) -- SENGAJA terpisah dari
// processScheduledRules (lib/scheduled-rules.ts), badge "sedang live" gak ada hubungan
// sama toggle visibility group/link.
export async function processLiveBadges(): Promise<void> {
  const rows = await db.select().from(liveBadges);
  for (const row of rows) {
    await checkAndUpdateLiveBadge(row);
  }
}
