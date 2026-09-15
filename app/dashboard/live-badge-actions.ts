"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { liveBadges } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";

// Satu page cuma bisa punya 1 live badge config (unique pageId) -- insert kalau belum
// ada, update kalau udah ada. isLive/videoUrl SENGAJA gak direset di sini, biar gak
// sempet nampilin badge "salah" sebelum cron cek ulang tick berikutnya.
export async function saveLiveBadgeAction(pageId: number, formData: FormData) {
  await requireOwnedPage(pageId);

  const channelUrl = String(formData.get("channelUrl") ?? "").trim();
  if (!channelUrl) return;
  const label = String(formData.get("label") ?? "").trim() || null;

  const existing = await db.select({ id: liveBadges.id }).from(liveBadges).where(eq(liveBadges.pageId, pageId)).limit(1);
  if (existing.length > 0) {
    await db.update(liveBadges).set({ channelUrl, label }).where(eq(liveBadges.pageId, pageId));
  } else {
    await db.insert(liveBadges).values({ pageId, channelUrl, label });
  }

  revalidatePath("/dashboard");
}

export async function deleteLiveBadgeAction(pageId: number) {
  await requireOwnedPage(pageId);
  await db.delete(liveBadges).where(eq(liveBadges.pageId, pageId));
  revalidatePath("/dashboard");
}
