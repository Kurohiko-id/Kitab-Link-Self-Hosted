import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { liveBadges } from "./schema";

// Dipanggil dari halaman publik (lihat components/live-badge.tsx).
export async function getActiveLiveStatus(pageId: number): Promise<{ videoUrl: string; label: string | null } | null> {
  const [row] = await db
    .select({ isLive: liveBadges.isLive, videoUrl: liveBadges.videoUrl, label: liveBadges.label })
    .from(liveBadges)
    .where(and(eq(liveBadges.pageId, pageId), eq(liveBadges.isLive, true)))
    .limit(1);

  if (!row?.videoUrl) return null;
  return { videoUrl: row.videoUrl, label: row.label };
}
