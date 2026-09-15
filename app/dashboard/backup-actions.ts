"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { linkGroups, links, pages } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import { getBoardData, type BoardLink } from "@/lib/db/board";
import { parseProfileData } from "@/lib/profile";

// Backup cuma nyakup profile+SEO+links+groups -- theme udah punya export/import sendiri
// di tab Theme (lihat theme-editor.tsx), jangan diduplikasi di sini.
const BACKUP_VERSION = 1;

export type PageBackup = {
  version: number;
  slug: string;
  profile: ReturnType<typeof parseProfileData>;
  groups: { name: string; isVisible: boolean; links: Omit<BoardLink, "id" | "groupId">[] }[];
  ungrouped: Omit<BoardLink, "id" | "groupId">[];
};

function stripLink(link: BoardLink): Omit<BoardLink, "id" | "groupId"> {
  const rest: Partial<BoardLink> = { ...link };
  delete rest.id;
  delete rest.groupId;
  return rest as Omit<BoardLink, "id" | "groupId">;
}

export async function exportPageDataAction(pageId: number): Promise<PageBackup> {
  const page = await requireOwnedPage(pageId);
  const board = await getBoardData(pageId);

  return {
    version: BACKUP_VERSION,
    slug: page.slug,
    profile: parseProfileData(page.profileJson),
    groups: board.groups.map((g) => ({ name: g.name, isVisible: g.isVisible, links: g.links.map(stripLink) })),
    ungrouped: board.ungrouped.map(stripLink),
  };
}

export async function importPageDataAction(pageId: number, json: string): Promise<{ error?: string }> {
  await requireOwnedPage(pageId);

  let backup: PageBackup;
  try {
    backup = JSON.parse(json);
  } catch {
    return { error: "File backup gak valid (bukan JSON)." };
  }
  if (backup.version !== BACKUP_VERSION || !Array.isArray(backup.groups) || !Array.isArray(backup.ungrouped)) {
    return { error: "Format backup gak dikenali atau versinya gak cocok." };
  }

  // Restore = ganti total links & groups yang ada sekarang -- ini disengaja (semantik
  // "restore dari backup"), makanya UI-nya kasih peringatan destruktif sebelum submit.
  await db.delete(links).where(eq(links.pageId, pageId));
  await db.delete(linkGroups).where(eq(linkGroups.pageId, pageId));

  for (const [index, link] of backup.ungrouped.entries()) {
    await db.insert(links).values({ ...link, pageId, groupId: null, orderIndex: index });
  }

  for (const [groupIndex, group] of backup.groups.entries()) {
    const [createdGroup] = await db
      .insert(linkGroups)
      .values({ pageId, name: group.name, isVisible: group.isVisible, orderIndex: groupIndex })
      .returning();
    for (const [linkIndex, link] of group.links.entries()) {
      await db.insert(links).values({ ...link, pageId, groupId: createdGroup.id, orderIndex: linkIndex });
    }
  }

  await db.update(pages).set({ profileJson: JSON.stringify(backup.profile) }).where(eq(pages.id, pageId));

  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
  return {};
}
