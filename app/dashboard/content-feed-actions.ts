"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { contentFeeds } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import { validateFeedUrl } from "@/lib/content-feeds";

export type CreateFeedState = { error?: string } | undefined;

export async function createContentFeedAction(
  pageId: number,
  _prevState: CreateFeedState,
  formData: FormData,
): Promise<CreateFeedState> {
  await requireOwnedPage(pageId);

  const feedUrl = String(formData.get("feedUrl") ?? "").trim();
  const groupId = Number(formData.get("groupId"));
  const richPreview = formData.get("richPreview") === "1";
  if (!feedUrl || !groupId) return { error: "Feed URL dan grup wajib diisi." };

  const check = await validateFeedUrl(feedUrl);
  if (!check.ok) return { error: "Gagal baca feed ini -- pastikan URL RSS/Atom valid." };

  await db.insert(contentFeeds).values({
    pageId,
    groupId,
    feedUrl,
    label: check.title.slice(0, 100),
    richPreview,
  });

  revalidatePath("/dashboard");
  return {};
}

export async function toggleContentFeedAction(pageId: number, feedId: number, isActive: boolean) {
  await requireOwnedPage(pageId);
  await db
    .update(contentFeeds)
    .set({ isActive })
    .where(and(eq(contentFeeds.id, feedId), eq(contentFeeds.pageId, pageId)));
  revalidatePath("/dashboard");
}

export async function deleteContentFeedAction(pageId: number, feedId: number) {
  await requireOwnedPage(pageId);
  await db.delete(contentFeeds).where(and(eq(contentFeeds.id, feedId), eq(contentFeeds.pageId, pageId)));
  revalidatePath("/dashboard");
}
