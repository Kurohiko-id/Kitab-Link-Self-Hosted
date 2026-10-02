import type { BoardLink } from "@/lib/db/board";

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
