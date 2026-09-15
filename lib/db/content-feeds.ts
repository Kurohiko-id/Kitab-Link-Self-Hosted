import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { contentFeeds, linkGroups } from "./schema";

export async function getContentFeedsForPage(pageId: number) {
  const rows = await db
    .select()
    .from(contentFeeds)
    .where(eq(contentFeeds.pageId, pageId))
    .orderBy(desc(contentFeeds.id));

  return Promise.all(
    rows.map(async (feed) => {
      const [group] = await db.select({ name: linkGroups.name }).from(linkGroups).where(eq(linkGroups.id, feed.groupId)).limit(1);
      return { ...feed, groupName: group?.name ?? `#${feed.groupId}` };
    }),
  );
}
