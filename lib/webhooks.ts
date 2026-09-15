import crypto from "node:crypto";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookQueue, webhooks } from "@/lib/db/schema";

const MAX_ATTEMPTS = 5;
// Exponential-ish backoff: 10dtk, 30dtk, 1mnt, 5mnt, 30mnt
const RETRY_BACKOFF_MS = [10_000, 30_000, 60_000, 5 * 60_000, 30 * 60_000];

export async function enqueueWebhookEvent(webhookId: number, payload: Record<string, unknown>) {
  await db.insert(webhookQueue).values({
    webhookId,
    payloadJson: JSON.stringify(payload),
  });
}

function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

async function deliverOne(
  queueRow: typeof webhookQueue.$inferSelect,
  webhook: typeof webhooks.$inferSelect,
) {
  try {
    const res = await fetch(webhook.targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KitabLink-Signature": signPayload(webhook.secret, queueRow.payloadJson),
        "X-KitabLink-Event": webhook.eventType,
      },
      body: queueRow.payloadJson,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await db.update(webhookQueue).set({ status: "sent" }).where(eq(webhookQueue.id, queueRow.id));
  } catch {
    const attempts = queueRow.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await db.update(webhookQueue).set({ status: "failed", attempts }).where(eq(webhookQueue.id, queueRow.id));
      return;
    }
    const delay = RETRY_BACKOFF_MS[Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)];
    await db
      .update(webhookQueue)
      .set({ attempts, nextRetryAt: new Date(Date.now() + delay) })
      .where(eq(webhookQueue.id, queueRow.id));
  }
}

// Dipanggil cron tiap ~10 detik (lihat instrumentation.ts).
export async function processWebhookQueue() {
  const due = await db
    .select()
    .from(webhookQueue)
    .where(and(eq(webhookQueue.status, "pending"), lte(webhookQueue.nextRetryAt, new Date())));

  for (const row of due) {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, row.webhookId)).limit(1);
    if (!webhook) {
      await db.update(webhookQueue).set({ status: "failed" }).where(eq(webhookQueue.id, row.id));
      continue;
    }
    await deliverOne(row, webhook);
  }
}
