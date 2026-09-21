"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { linkGroups, links, pages, themes } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import { getBoardData, type BoardLink } from "@/lib/db/board";
import { getThemeForPage, uniqueThemeName } from "@/lib/db/theme";
import { parseThemeTokens, type ThemeTokens } from "@/lib/theme";
import { parseProfileData, DEFAULT_PROFILE, type ProfileData } from "@/lib/profile";
import { logActivity } from "@/lib/db/activity-log";

// Backup gabungan Theme + Profile + Links, masing-masing OPSIONAL (lihat BackupScope) --
// versi 2 (cuma links) diganti total, sengaja gak backward-compat (single-user app, belum
// ada instalasi lain yang bakal punya file lama). Thumbnail link & path gambar profile
// (avatar/banner/OG/favicon) SENGAJA gak ikut kebawa -- semuanya nunjuk ke file upload yang
// gak ada di JSON ini, jadi kalau diisi ulang malah patah (gambar hilang).
const BACKUP_VERSION = 3;

export type BackupScope = { theme: boolean; profile: boolean; links: boolean };
export type ImportScope = { theme: boolean; profile: boolean; links: boolean };

type BackupLink = Omit<BoardLink, "id" | "groupId" | "thumbnailPath">;
type BackupLinks = { groups: { name: string; isVisible: boolean; links: BackupLink[] }[]; ungrouped: BackupLink[] };

export type PageBackup = {
  version: number;
  slug: string;
  theme?: ThemeTokens;
  profile?: ProfileData;
  links?: BackupLinks;
};

function stripLink(link: BoardLink): BackupLink {
  const rest: Partial<BoardLink> = { ...link };
  delete rest.id;
  delete rest.groupId;
  delete rest.thumbnailPath;
  return rest as BackupLink;
}

export async function exportPageDataAction(pageId: number, scope: BackupScope): Promise<PageBackup> {
  const page = await requireOwnedPage(pageId);
  const backup: PageBackup = { version: BACKUP_VERSION, slug: page.slug };

  if (scope.theme) {
    backup.theme = await getThemeForPage(pageId);
  }
  if (scope.profile) {
    backup.profile = parseProfileData(page.profileJson);
  }
  if (scope.links) {
    const board = await getBoardData(pageId);
    backup.links = {
      groups: board.groups.map((g) => ({ name: g.name, isVisible: g.isVisible, links: g.links.map(stripLink) })),
      ungrouped: board.ungrouped.map(stripLink),
    };
  }
  return backup;
}

export type ImportPageDataResult = { error?: string };

export async function importPageDataAction(
  pageId: number,
  json: string,
  scope: ImportScope,
): Promise<ImportPageDataResult> {
  const page = await requireOwnedPage(pageId);

  let backup: PageBackup;
  try {
    backup = JSON.parse(json);
  } catch {
    return { error: "File backup gak valid (bukan JSON)." };
  }
  if (backup.version !== BACKUP_VERSION) {
    return { error: "Format backup gak dikenali atau versinya gak cocok." };
  }

  const importedParts: string[] = [];

  if (scope.theme && backup.theme) {
    const tokens = parseThemeTokens(JSON.stringify(backup.theme));
    const name = await uniqueThemeName(page.userId, "Imported theme");
    const [created] = await db
      .insert(themes)
      .values({ userId: page.userId, name, tokensJson: JSON.stringify(tokens) })
      .returning();
    await db.update(pages).set({ themeId: created.id }).where(eq(pages.id, pageId));
    importedParts.push("theme");
  }

  if (scope.profile && backup.profile) {
    // Import cuma jalan kalau backup-nya BENERAN punya profile -- kalau file yang
    // di-import gak nyertain profile sama sekali (mis. hasil export "Links doang"),
    // profile page yang lagi jalan sekarang gak disentuh sama sekali (gak di-reset kosong).
    const profile: ProfileData = {
      ...DEFAULT_PROFILE,
      ...backup.profile,
      // Path gambar (avatar/banner/OG/favicon) nunjuk ke file upload yang gak ikut
      // kebawa di JSON ini -- kalau diisi ulang apa adanya, <img>-nya patah (404 di page
      // tujuan). Null-in biar fallback ke placeholder/auto-generate seperti page baru.
      avatarPath: null,
      bannerPath: null,
      ogImagePath: null,
      faviconPath: null,
    };
    await db.update(pages).set({ profileJson: JSON.stringify(profile) }).where(eq(pages.id, pageId));
    importedParts.push("profile");
  }

  if (scope.links && backup.links) {
    // Restore = ganti total links & groups yang ada sekarang -- ini disengaja (semantik
    // "restore dari backup"), makanya UI-nya kasih peringatan destruktif sebelum submit.
    await db.delete(links).where(eq(links.pageId, pageId));
    await db.delete(linkGroups).where(eq(linkGroups.pageId, pageId));

    for (const [index, link] of backup.links.ungrouped.entries()) {
      await db.insert(links).values({ ...link, pageId, groupId: null, thumbnailPath: null, orderIndex: index });
    }
    for (const [groupIndex, group] of backup.links.groups.entries()) {
      const [createdGroup] = await db
        .insert(linkGroups)
        .values({ pageId, name: group.name, isVisible: group.isVisible, orderIndex: groupIndex })
        .returning();
      for (const [linkIndex, link] of group.links.entries()) {
        await db.insert(links).values({ ...link, pageId, groupId: createdGroup.id, thumbnailPath: null, orderIndex: linkIndex });
      }
    }
    importedParts.push("links");
  }

  if (importedParts.length === 0) {
    return { error: "Gak ada bagian yang bisa di-import (file gak punya data yang dipilih)." };
  }

  logActivity(pageId, "backup_imported", importedParts.join(", "));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
  return {};
}
