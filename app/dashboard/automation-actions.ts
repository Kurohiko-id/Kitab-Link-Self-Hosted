"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { scheduledRules } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import type { ScheduleMode } from "@/lib/schedule-evaluate";
import { checkAndApplyScheduledRule } from "@/lib/scheduled-rules";

// Format target dari <select> di form: "group:3" atau "link:7".
function parseTarget(formData: FormData): { targetType: "group" | "link"; targetId: number } | null {
  const target = String(formData.get("target") ?? "");
  const [targetType, targetIdRaw] = target.split(":");
  const targetId = Number(targetIdRaw);
  if ((targetType !== "group" && targetType !== "link") || !targetId) return null;
  return { targetType, targetId };
}

function parseMode(formData: FormData): ScheduleMode {
  return formData.get("mode") === "hide_during" ? "hide_during" : "show_during";
}

export async function createYoutubeLiveRule(pageId: number, formData: FormData) {
  await requireOwnedPage(pageId);

  const channelUrl = String(formData.get("channelUrl") ?? "").trim();
  const target = parseTarget(formData);
  if (!channelUrl || !target) return;

  await db.insert(scheduledRules).values({
    pageId,
    triggerType: "youtube_live",
    configJson: JSON.stringify({ channelUrl }),
    ...target,
  });

  revalidatePath("/dashboard");
}

export async function createWeeklyScheduleRule(pageId: number, formData: FormData) {
  await requireOwnedPage(pageId);

  const days = formData
    .getAll("days")
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const target = parseTarget(formData);
  if (days.length === 0 || !target) return;

  // Input <input type="date"> cuma ngasih "YYYY-MM-DD" -> dilebarin ke akhir hari biar
  // "sampai tanggal X" beneran nyakup seharian penuh tanggal X.
  const untilDateRaw = String(formData.get("untilDate") ?? "").trim();
  const untilDate = untilDateRaw ? `${untilDateRaw}T23:59:59` : null;

  await db.insert(scheduledRules).values({
    pageId,
    triggerType: "weekly_schedule",
    configJson: JSON.stringify({ days, mode: parseMode(formData), untilDate }),
    ...target,
  });

  revalidatePath("/dashboard");
}

export async function deleteScheduledRule(pageId: number, ruleId: number) {
  await requireOwnedPage(pageId);
  await db
    .delete(scheduledRules)
    .where(and(eq(scheduledRules.id, ruleId), eq(scheduledRules.pageId, pageId)));
  revalidatePath("/dashboard");
}

// Tombol "Refresh Status" manual di rule aktif (khusus youtube_live -- weekly_schedule
// gak butuh fetch eksternal, evaluasinya deterministik dari jam/tanggal doang, gak ada
// gunanya di-refresh manual). Pake logic yang SAMA persis kayak cron (checkAndApplyScheduledRule).
export async function refreshScheduledRuleAction(pageId: number, ruleId: number): Promise<{ error?: string }> {
  await requireOwnedPage(pageId);
  const [rule] = await db
    .select()
    .from(scheduledRules)
    .where(and(eq(scheduledRules.id, ruleId), eq(scheduledRules.pageId, pageId)))
    .limit(1);
  if (!rule) return { error: "Rule tidak ditemukan." };

  const ok = await checkAndApplyScheduledRule(rule);
  revalidatePath("/dashboard");
  if (!ok) return { error: "Gagal cek status (coba lagi sebentar)." };
  return {};
}
