import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { links, pages } from "./schema";

export type DeadLink = { id: number; title: string; pageId: number; pageSlug: string };

// Lintas SEMUA page milik user (sama pola kayak getAllLinksForUser) -- notif bell di
// dashboard nampilin ini gabungan, bukan per-page.
export async function getDeadLinksForUser(userId: number): Promise<DeadLink[]> {
  return db
    .select({ id: links.id, title: links.title, pageId: links.pageId, pageSlug: pages.slug })
    .from(links)
    .innerJoin(pages, eq(links.pageId, pages.id))
    .where(and(eq(pages.userId, userId), eq(links.lastCheckStatus, "dead")));
}
