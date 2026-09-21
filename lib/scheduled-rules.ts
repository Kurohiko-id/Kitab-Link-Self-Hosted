import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { linkGroups, links, scheduledRules } from "@/lib/db/schema";
import { checkYoutubeLive } from "@/lib/youtube-live";
import { evaluateWeeklySchedule, type WeeklyScheduleConfig } from "@/lib/schedule-evaluate";
import { logActivity } from "@/lib/db/activity-log";

type ScheduledRuleRow = typeof scheduledRules.$inferSelect;

// Nama fitur ini di Activity Log -- generik "Auto Show" buat semua trigger type (youtube_live
// ATAUPUN weekly_schedule), sesuai permintaan user, bukan dibedain per mekanisme.
function ruleLabel(): string {
  return "Auto Show";
}

// Dipakai semua trigger type -> nulis ke target (group/link) cuma kalau state-nya
// beneran berubah, lastState dipakai generik ("live" = tampil, "offline" = sembunyi).
async function applyRuleState(rule: ScheduledRuleRow, desiredVisible: boolean) {
  const newState = desiredVisible ? "live" : "offline";
  const changed = newState !== rule.lastState;

  if (changed) {
    if (rule.targetType === "group") {
      const [updated] = await db
        .update(linkGroups)
        .set({ isVisible: desiredVisible })
        .where(eq(linkGroups.id, rule.targetId))
        .returning();
      logActivity(rule.pageId, desiredVisible ? "group_shown" : "group_hidden", updated?.name ?? null, "automation", ruleLabel());
    } else {
      const [updated] = await db
        .update(links)
        .set({ isActive: desiredVisible })
        .where(eq(links.id, rule.targetId))
        .returning();
      logActivity(rule.pageId, desiredVisible ? "link_shown" : "link_hidden", updated?.title ?? null, "automation", ruleLabel());
    }
  }

  const now = new Date();
  await db
    .update(scheduledRules)
    .set({ lastState: newState, lastCheckedAt: now, ...(changed ? { lastTriggeredAt: now } : {}) })
    .where(eq(scheduledRules.id, rule.id));
}

// Dipake cron (processScheduledRules, tiap ~2 menit) DAN tombol "Refresh Status" manual
// (scheduled-rule-actions.ts, khusus rule youtube_live) -- satu sumber logic. Return true
// kalau berhasil dievaluasi, false kalau gagal cek (network error dll, caller boleh diemin).
export async function checkAndApplyScheduledRule(rule: ScheduledRuleRow): Promise<boolean> {
  if (rule.triggerType === "youtube_live") {
    const config = JSON.parse(rule.configJson) as { channelUrl?: string };
    if (!config.channelUrl) return false;

    const status = await checkYoutubeLive(config.channelUrl);
    if (status === null) return false; // gagal cek (network error dll) — jangan ubah apapun, coba lagi nanti

    await applyRuleState(rule, status.isLive);
    return true;
  }
  if (rule.triggerType === "weekly_schedule") {
    const config = JSON.parse(rule.configJson) as WeeklyScheduleConfig;
    await applyRuleState(rule, evaluateWeeklySchedule(config));
    return true;
  }
  // "manual" -> gak ada evaluasi otomatis, sengaja dilewatin.
  return false;
}

// Dipanggil cron tiap ~2 menit (lihat instrumentation.ts). Cuma buat auto show/hide
// group/link -- badge "sedang live" itu fitur terpisah, lihat lib/live-badge-check.ts.
export async function processScheduledRules() {
  const rules = await db.select().from(scheduledRules);
  for (const rule of rules) {
    await checkAndApplyScheduledRule(rule);
  }
}
