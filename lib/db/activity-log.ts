import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { activityLogs } from "./schema";

export type ActivityAction =
  | "link_created"
  | "link_updated"
  | "link_deleted"
  | "link_shown"
  | "link_hidden"
  | "group_created"
  | "group_renamed"
  | "group_deleted"
  | "group_shown"
  | "group_hidden"
  | "theme_changed"
  | "theme_edited"
  | "css_updated"
  | "profile_updated"
  | "backup_imported"
  | "live_badge_on"
  | "live_badge_off"
  | "discord_widget_created"
  | "discord_widget_updated"
  | "discord_widget_deleted"
  | "discord_widget_enabled"
  | "discord_widget_disabled";

export type ActivitySource = "dashboard" | "automation" | "api";

// Fire-and-forget kayak recordPageView/recordLinkClick di lib/db/analytics.ts -- gagal
// nyatet log gak boleh sampe bikin aksi utamanya (hide/show/tambah link, dst) gagal.
// source default "dashboard" -- semua call site lama (aksi manual dashboard) gak perlu
// diubah, cuma call site baru (cron automation, API token) yang perlu isi source+label.
export function logActivity(
  pageId: number,
  action: ActivityAction,
  detail: string | null,
  source: ActivitySource = "dashboard",
  sourceLabel: string | null = null,
) {
  db.insert(activityLogs)
    .values({ pageId, action, detail, source, sourceLabel })
    .catch((err) => console.error("[activity-log] gagal catat:", err));
}

export async function getActivityLogForPage(pageId: number, limit = 100) {
  return db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.pageId, pageId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}
