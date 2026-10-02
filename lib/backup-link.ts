import type { BoardLink } from "@/lib/db/board";
import { serializeLinkOverride } from "@/lib/link-style";

// imageButtonId SENGAJA dibuang juga: id itu cuma valid di library user/instance asalnya,
// kalau ikut ke backup lalu di-import ke page lain dia nunjuk image button milik orang
// lain (atau id yang gak ada). Gambarnya memang gak ikut backup (sama kayak thumbnailPath).
export type BackupLink = Omit<BoardLink, "id" | "groupId" | "thumbnailPath" | "imageButtonId">;

export function stripLink(link: BoardLink): BackupLink {
  const rest: Partial<BoardLink> = { ...link };
  delete rest.id;
  delete rest.groupId;
  delete rest.thumbnailPath;
  delete rest.imageButtonId;
  return rest as BackupLink;
}

// Baris siap insert dari BackupLink: styleOverride (objek) diganti kolom JSON tersanitasi.
// Backup lama (sebelum fitur ini) gak punya field-nya -> undefined -> null. Nilai dari file
// orang lain TIDAK dipercaya: selalu lewat sanitizeLinkOverride.
export function restoreLinkRow(link: BackupLink): Omit<BackupLink, "styleOverride"> & { styleOverrideJson: string | null } {
  const { styleOverride, ...rest } = link;
  return { ...rest, styleOverrideJson: serializeLinkOverride(styleOverride) };
}
