import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { imageButtons, links } from "./schema";
import { deleteImage, saveImage } from "@/lib/images/storage";

export type ImageButtonRow = {
  id: number;
  label: string;
  path: string;
  createdAt: Date;
  usedCount: number;
};

// Subquery korelasi ditulis string mentah (bukan ${imageButtons.id}) -- drizzle bisa render
// kolom luar tanpa prefix tabel di select satu-tabel, dan "id" polos bakal nyangkut ke
// tabel dalam (links.id) -> hitungannya salah diam-diam.
const usedCountSql = sql<number>`(select count(*) from links where links.image_button_id = image_buttons.id)`;

export async function listImageButtons(userId: number): Promise<ImageButtonRow[]> {
  return db
    .select({
      id: imageButtons.id,
      label: imageButtons.label,
      path: imageButtons.path,
      createdAt: imageButtons.createdAt,
      usedCount: usedCountSql,
    })
    .from(imageButtons)
    .where(eq(imageButtons.userId, userId))
    .orderBy(desc(imageButtons.createdAt), desc(imageButtons.id));
}

// usedInTheme = ada link (di page mana pun) yang pakai image button ini DAN page-nya lagi
// memakai theme itu. Buat penanda di dialog export.
export async function listImageButtonsForExport(userId: number, themeId: number) {
  return db
    .select({
      id: imageButtons.id,
      label: imageButtons.label,
      path: imageButtons.path,
      createdAt: imageButtons.createdAt,
      usedCount: usedCountSql,
      usedInTheme: sql<number>`exists(select 1 from links join pages on pages.id = links.page_id where links.image_button_id = image_buttons.id and pages.theme_id = ${themeId})`.mapWith(Boolean),
    })
    .from(imageButtons)
    .where(eq(imageButtons.userId, userId))
    .orderBy(desc(imageButtons.createdAt), desc(imageButtons.id));
}

export async function requireOwnedImageButton(userId: number, id: number) {
  const [row] = await db
    .select()
    .from(imageButtons)
    .where(and(eq(imageButtons.id, id), eq(imageButtons.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Image button tidak ditemukan atau bukan milik Anda.");
  return row;
}

export async function createImageButton(userId: number, label: string, webp: Buffer) {
  const path = await saveImage(webp, "image-buttons");
  const [row] = await db.insert(imageButtons).values({ userId, label, path }).returning();
  return { id: row.id, path: row.path };
}

// Urutan: tulis file baru -> update DB -> baru hapus file lama. Kalau gagal di tengah,
// path di DB gak pernah nunjuk file yang udah kehapus.
export async function replaceImageButtonImage(userId: number, id: number, webp: Buffer) {
  const existing = await requireOwnedImageButton(userId, id);
  const newPath = await saveImage(webp, "image-buttons");
  await db.update(imageButtons).set({ path: newPath }).where(eq(imageButtons.id, id));
  await deleteImage(existing.path);
}

export async function renameImageButton(userId: number, id: number, label: string) {
  await requireOwnedImageButton(userId, id);
  await db.update(imageButtons).set({ label }).where(eq(imageButtons.id, id));
}

export async function deleteImageButton(
  userId: number,
  id: number,
): Promise<{ ok: true } | { error: "in_use"; count: number }> {
  const existing = await requireOwnedImageButton(userId, id);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(links)
    .where(eq(links.imageButtonId, id));
  if (count > 0) return { error: "in_use", count };
  await db.delete(imageButtons).where(eq(imageButtons.id, id));
  await deleteImage(existing.path);
  return { ok: true };
}

// Dipakai import theme (label dari file orang lain bisa bentrok sama punya sendiri).
export async function uniqueImageButtonLabel(userId: number, base: string): Promise<string> {
  const rows = await db.select({ label: imageButtons.label }).from(imageButtons).where(eq(imageButtons.userId, userId));
  const labels = new Set(rows.map((r) => r.label));
  if (!labels.has(base)) return base;
  let i = 2;
  while (labels.has(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}
