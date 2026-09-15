import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { apiTokens, webhookQueue, webhooks } from "./schema";

export async function getApiTokensForUser(userId: number) {
  return db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(desc(apiTokens.createdAt));
}

export async function getWebhooksForUser(userId: number) {
  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, userId))
    .orderBy(desc(webhooks.createdAt));

  return Promise.all(
    rows.map(async (webhook) => {
      const [lastEvent] = await db
        .select()
        .from(webhookQueue)
        .where(eq(webhookQueue.webhookId, webhook.id))
        .orderBy(desc(webhookQueue.id))
        .limit(1);
      return {
        ...webhook,
        lastEventStatus: lastEvent?.status ?? null,
        lastEventAttempts: lastEvent?.attempts ?? 0,
      };
    }),
  );
}
