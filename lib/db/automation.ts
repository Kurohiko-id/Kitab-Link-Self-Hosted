import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { linkGroups, links, scheduledRules } from "./schema";

export async function getScheduledRulesForPage(pageId: number) {
  const rules = await db
    .select()
    .from(scheduledRules)
    .where(eq(scheduledRules.pageId, pageId))
    .orderBy(desc(scheduledRules.id));

  return Promise.all(
    rules.map(async (rule) => {
      let targetName = `#${rule.targetId}`;
      if (rule.targetType === "group") {
        const [group] = await db.select().from(linkGroups).where(eq(linkGroups.id, rule.targetId)).limit(1);
        if (group) targetName = group.name;
      } else {
        const [link] = await db.select().from(links).where(eq(links.id, rule.targetId)).limit(1);
        if (link) targetName = link.title;
      }
      return { ...rule, targetName };
    }),
  );
}
