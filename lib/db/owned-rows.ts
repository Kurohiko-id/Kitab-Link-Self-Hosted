import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { linkGroups, links } from "./schema";

// Cek kepemilikan baris anak (link/group) terhadap page. requireOwnedPage cuma ngecek
// page-nya milik user -- ID link/group dari client tetap harus dicek ikut page itu, kalau
// enggak (pageId A, linkId milik B) lolos. Sengaja gak import requireOwnedPage (nyeret
// next/headers) biar file ini bisa dites murni; pemanggil wajib requireOwnedPage dulu.

export async function findOwnedLink(pageId: number, linkId: number) {
  const [row] = await db
    .select()
    .from(links)
    .where(and(eq(links.id, linkId), eq(links.pageId, pageId)))
    .limit(1);
  return row;
}

export async function findOwnedGroup(pageId: number, groupId: number) {
  const [row] = await db
    .select()
    .from(linkGroups)
    .where(and(eq(linkGroups.id, groupId), eq(linkGroups.pageId, pageId)))
    .limit(1);
  return row;
}

export async function requireOwnedLink(pageId: number, linkId: number) {
  const row = await findOwnedLink(pageId, linkId);
  if (!row) throw new Error("Link tidak ditemukan di page ini.");
  return row;
}

export async function requireOwnedGroup(pageId: number, groupId: number) {
  const row = await findOwnedGroup(pageId, groupId);
  if (!row) throw new Error("Grup tidak ditemukan di page ini.");
  return row;
}

// Buat operasi batch (persistBoard, social links): semua ID dari client harus milik pageId.
// Dipanggil SEBELUM db.transaction (transaksi better-sqlite3 sync, gak bisa await di dalamnya).
export async function assertOwnedIds(pageId: number, ids: { linkIds?: number[]; groupIds?: number[] }) {
  if (ids.linkIds?.length) {
    const owned = new Set(
      (await db.select({ id: links.id }).from(links).where(eq(links.pageId, pageId))).map((r) => r.id),
    );
    if (ids.linkIds.some((id) => !owned.has(id))) throw new Error("Ada link yang bukan milik page ini.");
  }
  if (ids.groupIds?.length) {
    const owned = new Set(
      (await db.select({ id: linkGroups.id }).from(linkGroups).where(eq(linkGroups.pageId, pageId))).map((r) => r.id),
    );
    if (ids.groupIds.some((id) => !owned.has(id))) throw new Error("Ada grup yang bukan milik page ini.");
  }
}
