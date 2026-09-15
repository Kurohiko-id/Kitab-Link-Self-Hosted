import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { linkGroups, links, scheduledRules } from "@/lib/db/schema";
import { checkYoutubeLive } from "@/lib/youtube-live";
import { evaluateWeeklySchedule, type WeeklyScheduleConfig } from "@/lib/schedule-evaluate";

type ScheduledRuleRow = typeof scheduledRules.$inferSelect;

// Dipakai semua trigger type -> nulis ke target (group/link) cuma kalau state-nya
// beneran berubah, lastState dipakai generik ("live" = tampil, "offline" = sembunyi).
async function applyRuleState(rule: ScheduledRuleRow, desiredVisible: boolean) {
  const newState = desiredVisible ? "live" : "offline";

  if (newState !== rule.lastState) {
    if (rule.targetType === "group") {
      await db.update(linkGroups).set({ isVisible: desiredVisible }).where(eq(linkGroups.id, rule.targetId));
    } else {
      await db.update(links).set({ isActive: desiredVisible }).where(eq(links.id, rule.targetId));
    }
  }

  await db
    .update(scheduledRules)
    .set({ lastState: newState, lastCheckedAt: new Date() })
    .where(eq(scheduledRules.id, rule.id));
}

// Dipanggil cron tiap ~2 menit (lihat instrumentation.ts). Cuma buat auto show/hide
// group/link -- badge "sedang live" itu fitur terpisah, lihat lib/live-badge-check.ts.
export async function processScheduledRules() {
  const rules = await db.select().from(scheduledRules);

  for (const rule of rules) {
    if (rule.triggerType === "youtube_live") {
      const config = JSON.parse(rule.configJson) as { channelUrl?: string };
      if (!config.channelUrl) continue;

      const status = await checkYoutubeLive(config.channelUrl);
      if (status === null) continue; // gagal cek (network error dll) — jangan ubah apapun, coba lagi nanti

      await applyRuleState(rule, status.isLive);
    } else if (rule.triggerType === "weekly_schedule") {
      const config = JSON.parse(rule.configJson) as WeeklyScheduleConfig;
      await applyRuleState(rule, evaluateWeeklySchedule(config));
    }
    // "manual" -> gak ada evaluasi otomatis, sengaja dilewatin.
  }
}
