"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { linkGroups, links } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import type { DisplayStyle, LinkType } from "@/lib/db/board";
import { processImage } from "@/lib/images/process-image";
import { deleteImage, saveFile, saveImage } from "@/lib/images/storage";
import { fetchOgImageBuffer } from "@/lib/images/og-image";
import { logActivity } from "@/lib/db/activity-log";

const MAX_THUMBNAIL_WIDTH = 800;
const MAX_LINK_FILE_BYTES = 20 * 1024 * 1024; // 20MB, cukup buat PDF/dokumen umum
const VALID_LINK_TYPES: LinkType[] = ["url", "email", "phone", "whatsapp", "file", "embed", "copy", "accordion"];

// File link tipe "file" bisa berupa url eksternal ATAU upload sendiri (path relatif
// "link-files/..") -> ini yang dites, bukan http(s) berarti upload lokal, aman dihapus.
function isLocalUploadPath(value: string): boolean {
  return !/^https?:\/\//i.test(value);
}

export type PersistBoardInput = {
  pageId: number;
  groupOrder: number[];
  groups: Record<number, number[]>;
  ungrouped: number[];
};

// Balikin { id, name } (bukan void) -- dipakai buat "tambah group" instan dari dalam
// modal Link (link-form-modal.tsx) tanpa nutup modal-nya, biar group baru bisa langsung
// ke-pilih di dropdown target tanpa nunggu round-trip revalidatePath.
export async function createGroup(pageId: number, name: string): Promise<{ id: number; name: string } | null> {
  await requireOwnedPage(pageId);
  const trimmed = name.trim();
  if (!trimmed) return null;

  const existingGroups = await db.select().from(linkGroups).where(eq(linkGroups.pageId, pageId));
  const [created] = await db
    .insert(linkGroups)
    .values({ pageId, name: trimmed, orderIndex: existingGroups.length })
    .returning({ id: linkGroups.id, name: linkGroups.name });

  logActivity(pageId, "group_created", created.name);
  revalidatePath("/dashboard");
  return created;
}

export async function renameGroup(pageId: number, groupId: number, name: string) {
  await requireOwnedPage(pageId);
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.update(linkGroups).set({ name: trimmed }).where(eq(linkGroups.id, groupId));
  revalidatePath("/dashboard");
}

export async function deleteGroup(pageId: number, groupId: number) {
  await requireOwnedPage(pageId);
  const [existing] = await db.select().from(linkGroups).where(eq(linkGroups.id, groupId)).limit(1);
  await db.delete(linkGroups).where(eq(linkGroups.id, groupId));
  logActivity(pageId, "group_deleted", existing?.name ?? null);
  revalidatePath("/dashboard");
}

export async function toggleGroupVisibility(pageId: number, groupId: number, isVisible: boolean) {
  await requireOwnedPage(pageId);
  const [updated] = await db
    .update(linkGroups)
    .set({ isVisible })
    .where(eq(linkGroups.id, groupId))
    .returning({ name: linkGroups.name });
  logActivity(pageId, isVisible ? "group_shown" : "group_hidden", updated?.name ?? null);
  revalidatePath("/dashboard");
}

export async function deleteLink(pageId: number, linkId: number) {
  await requireOwnedPage(pageId);
  const [existing] = await db.select().from(links).where(eq(links.id, linkId)).limit(1);
  await db.delete(links).where(eq(links.id, linkId));
  await deleteImage(existing?.thumbnailPath);
  if (existing?.linkType === "file" && isLocalUploadPath(existing.url)) {
    await deleteImage(existing.url);
  }
  logActivity(pageId, "link_deleted", existing?.title ?? null);
  revalidatePath("/dashboard");
}

export async function toggleLinkActive(pageId: number, linkId: number, isActive: boolean) {
  await requireOwnedPage(pageId);
  const [updated] = await db
    .update(links)
    .set({ isActive })
    .where(eq(links.id, linkId))
    .returning({ title: links.title });
  logActivity(pageId, isActive ? "link_shown" : "link_hidden", updated?.title ?? null);
  revalidatePath("/dashboard");
}

export async function toggleLinkFeatured(pageId: number, linkId: number, featured: boolean) {
  await requireOwnedPage(pageId);
  await db.update(links).set({ featured }).where(eq(links.id, linkId));
  revalidatePath("/dashboard");
}

export type SaveLinkState = { error?: string } | undefined;

// Satu action buat form Tambah/Edit Link (modal) — cover title/url/description/
// thumbnail/group/style/icon sekaligus, ganti createLink+uploadLinkThumbnail+
// updateLinkDisplayStyle yang dulu terpisah-pisah di UI lama.
export async function saveLinkAction(
  pageId: number,
  linkId: number | null,
  _prevState: SaveLinkState,
  formData: FormData,
): Promise<SaveLinkState> {
  await requireOwnedPage(pageId);

  const title = String(formData.get("title") ?? "").trim();
  let url = String(formData.get("url") ?? "").trim();

  const linkTypeRaw = String(formData.get("linkType") ?? "url");
  const linkType = VALID_LINK_TYPES.includes(linkTypeRaw as LinkType) ? (linkTypeRaw as LinkType) : "url";

  // Tipe "file" boleh isi url manual (link eksternal) ATAU upload file sendiri —
  // upload menang kalau dua-duanya diisi, sama kayak pola thumbnail di bawah.
  let newLinkFilePath: string | null = null;
  if (linkType === "file") {
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_LINK_FILE_BYTES) {
        return { error: "File terlalu besar (maks 20MB)." };
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const buffer = Buffer.from(await file.arrayBuffer());
      newLinkFilePath = await saveFile(buffer, "link-files", ext);
      url = newLinkFilePath;
    }
  }

  if (!title || !url) {
    return { error: "Judul dan URL wajib diisi." };
  }

  const description = String(formData.get("description") ?? "").trim() || null;
  const displayStyle = String(formData.get("displayStyle") ?? "pill") as DisplayStyle;
  const icon = String(formData.get("icon") ?? "") || null;
  const target = String(formData.get("target") ?? "ungrouped");
  const groupId = target.startsWith("group:") ? Number(target.slice("group:".length)) : null;
  const featured = formData.get("featured") === "1";
  const utmSource = String(formData.get("utmSource") ?? "").trim() || null;
  const utmMedium = String(formData.get("utmMedium") ?? "").trim() || null;
  const utmCampaign = String(formData.get("utmCampaign") ?? "").trim() || null;

  const removeThumbnail = formData.get("removeThumbnail") === "1";

  let newThumbnailPath: string | null = null;
  const thumbnailFile = formData.get("thumbnail");
  if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
    if (!thumbnailFile.type.startsWith("image/")) {
      return { error: "File thumbnail harus berupa gambar." };
    }
    const buffer = Buffer.from(await thumbnailFile.arrayBuffer());
    const webp = await processImage(buffer, MAX_THUMBNAIL_WIDTH);
    newThumbnailPath = await saveImage(webp, "link-thumbnails");
  }

  const values = { title, url, description, displayStyle, icon, groupId, linkType, featured, utmSource, utmMedium, utmCampaign };

  if (linkId) {
    const [existing] = await db.select().from(links).where(eq(links.id, linkId)).limit(1);
    // Upload baru menang kalau ada; kalau gak ada tapi user minta hapus, kosongkan; kalau gak dua-duanya, biarkan.
    const finalThumbnailPath = newThumbnailPath ?? (removeThumbnail ? null : existing?.thumbnailPath ?? null);
    await db.update(links).set({ ...values, thumbnailPath: finalThumbnailPath }).where(eq(links.id, linkId));
    if ((newThumbnailPath || removeThumbnail) && existing?.thumbnailPath) {
      await deleteImage(existing.thumbnailPath);
    }
    // Ganti file upload lama (tipe "file") dengan yang baru -> file lama dihapus biar gak numpuk.
    if (newLinkFilePath && existing?.linkType === "file" && existing.url && isLocalUploadPath(existing.url)) {
      await deleteImage(existing.url);
    }
    await maybeFetchOgImage(linkId, displayStyle, url, finalThumbnailPath);
  } else {
    const existingLinks = await db.select().from(links).where(eq(links.pageId, pageId));
    const [created] = await db
      .insert(links)
      .values({ pageId, ...values, thumbnailPath: newThumbnailPath, orderIndex: existingLinks.length })
      .returning();
    await maybeFetchOgImage(created.id, displayStyle, url, newThumbnailPath);
    logActivity(pageId, "link_created", created.title);
  }

  revalidatePath("/dashboard");
}

async function maybeFetchOgImage(
  linkId: number,
  displayStyle: DisplayStyle,
  url: string,
  currentThumbnail: string | null,
) {
  if (displayStyle !== "rich" || currentThumbnail) return;
  const ogBuffer = await fetchOgImageBuffer(url);
  if (!ogBuffer) return;
  try {
    const webp = await processImage(ogBuffer, MAX_THUMBNAIL_WIDTH);
    const relativePath = await saveImage(webp, "link-thumbnails");
    await db.update(links).set({ thumbnailPath: relativePath }).where(eq(links.id, linkId));
  } catch {
    // Gambar OG gagal diproses (format tidak didukung, dll) — rich card tampil tanpa gambar.
  }
}

export async function persistBoard(input: PersistBoardInput) {
  await requireOwnedPage(input.pageId);

  db.transaction((tx) => {
    input.groupOrder.forEach((groupId, index) => {
      tx.update(linkGroups).set({ orderIndex: index }).where(eq(linkGroups.id, groupId)).run();
    });

    input.groupOrder.forEach((groupId) => {
      const linkIds = input.groups[groupId] ?? [];
      linkIds.forEach((linkId, index) => {
        tx.update(links).set({ groupId, orderIndex: index }).where(eq(links.id, linkId)).run();
      });
    });

    input.ungrouped.forEach((linkId, index) => {
      tx.update(links).set({ groupId: null, orderIndex: index }).where(eq(links.id, linkId)).run();
    });
  });
}
