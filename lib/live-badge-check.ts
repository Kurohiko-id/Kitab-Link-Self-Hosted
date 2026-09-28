import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveBadges } from "@/lib/db/schema";
import { checkYoutubeLive } from "@/lib/youtube-live";
import { getYoutubeApiKeyForPage } from "@/lib/youtube-api-key";
import { logActivity } from "@/lib/db/activity-log";

type LiveBadgeRow = typeof liveBadges.$inferSelect;

// Dipake cron (processLiveBadges, tiap ~2 menit) DAN tombol "Refresh Status" manual
// (live-badge-actions.ts) -- satu sumber logic, biar dua jalur itu gak pernah beda hasil.
// Return status abis update, null kalau gagal cek (network error dll, caller boleh diemin).
export async function checkAndUpdateLiveBadge(row: LiveBadgeRow) {
  const apiKey = await getYoutubeApiKeyForPage(row.pageId);
  let status = await checkYoutubeLive(row.channelUrl, apiKey);
  if (status === null) return null;

  // Transisi offline -> live nampilin badge merah "sedang live" di halaman publik --
  // efek yang KELIATAN pengunjung, jadi sebelum dianggap final, cek ulang sekali. Kalau
  // bacaan kedua beda/gagal, diemin (biarin cron 2 menit berikutnya yang mutusin) daripada
  // nyalain badge dari 1 bacaan yang belum tentu bener.
  if (status.isLive && !row.isLive) {
    const confirm = await checkYoutubeLive(row.channelUrl, apiKey);
    if (confirm === null || !confirm.isLive) return null;
    status = confirm;
  }

  const wentLive = status.isLive && !row.isLive;
  const stateChanged = status.isLive !== row.isLive;
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

  if (stateChanged) {
    logActivity(row.pageId, status.isLive ? "live_badge_on" : "live_badge_off", row.label, "automation", "Live Badge");
  }

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
