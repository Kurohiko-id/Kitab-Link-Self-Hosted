"use server";

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { apiTokens, webhooks } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/require-session";
import { createApiToken } from "@/lib/auth/api-tokens";
import { enqueueWebhookEvent } from "@/lib/webhooks";

const VALID_SCOPES = ["links:read", "links:write"] as const;
type Scope = (typeof VALID_SCOPES)[number];

export async function createApiTokenAction(name: string, scopes: string[]) {
  const session = await requireSession();
  const validScopes = scopes.filter((s): s is Scope => (VALID_SCOPES as readonly string[]).includes(s));
  const result = await createApiToken(session.userId, name, validScopes);
  revalidatePath("/dashboard");
  return result;
}

export async function revokeApiToken(tokenId: number) {
  const session = await requireSession();
  await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, session.userId)));
  revalidatePath("/dashboard");
}

export async function createWebhookAction(
  pageId: number | null,
  eventType: (typeof webhooks.$inferInsert)["eventType"],
  formData: FormData,
) {
  const session = await requireSession();
  const trimmedUrl = String(formData.get("targetUrl") ?? "").trim();
  if (!trimmedUrl) return;

  await db.insert(webhooks).values({
    userId: session.userId,
    pageId,
    eventType,
    targetUrl: trimmedUrl,
    secret: crypto.randomBytes(24).toString("hex"),
  });

  revalidatePath("/dashboard");
}

export async function deleteWebhook(webhookId: number) {
  const session = await requireSession();
  await db.delete(webhooks).where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, session.userId)));
  revalidatePath("/dashboard");
}

export async function sendTestWebhookEvent(webhookId: number) {
  const session = await requireSession();
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, session.userId)))
    .limit(1);
  if (!webhook) return;

  await enqueueWebhookEvent(webhookId, {
    event: "test.ping",
    sentAt: new Date().toISOString(),
    message: "Ini event tes dari Kitab Link.",
  });

  revalidatePath("/dashboard");
}
