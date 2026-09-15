import { eq } from "drizzle-orm";
import { db } from "./index";
import { liveBadges } from "./schema";

export type LiveBadgeRow = typeof liveBadges.$inferSelect;

export async function getLiveBadgeForPage(pageId: number): Promise<LiveBadgeRow | null> {
  const [row] = await db.select().from(liveBadges).where(eq(liveBadges.pageId, pageId)).limit(1);
  return row ?? null;
}
