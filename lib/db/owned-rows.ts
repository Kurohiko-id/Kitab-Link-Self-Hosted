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

// Buat operasi batch (persistBoard, social links): ID dari client yang bukan milik pageId
// (basi karena kehapus di tab lain, atau milik page lain) DIBUANG, bukan throw -- tab basi itu
// skenario normal. Yang penting ID asing gak pernah sampai ke WHERE write. Dipanggil SEBELUM
// db.transaction (transaksi better-sqlite3 sync, gak bisa await di dalamnya).
export async function getOwnedIds(pageId: number) {
  const [linkRows, groupRows] = await Promise.all([
    db.select({ id: links.id }).from(links).where(eq(links.pageId, pageId)),
    db.select({ id: linkGroups.id }).from(linkGroups).where(eq(linkGroups.pageId, pageId)),
  ]);
  return {
    links: new Set(linkRows.map((r) => r.id)),
    groups: new Set(groupRows.map((r) => r.id)),
  };
}
