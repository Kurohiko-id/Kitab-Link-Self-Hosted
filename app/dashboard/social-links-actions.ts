"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { links, pages } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import { parseProfileData } from "@/lib/profile";
import { BRAND_ICONS } from "@/lib/icons";
import type { IconPosition } from "@/lib/db/board";

export type SocialLinkItem = { id?: number; icon: string; url: string };
export type SocialLinksByPosition = { top: SocialLinkItem[]; bottom: SocialLinkItem[] };

// Link "icon" (lihat lib/db/board.ts's DisplayStyle) yang udah ada buat page ini,
// dipecah per posisi -- atas dan bawah punya daftarnya sendiri-sendiri, independen.
export async function getSocialLinksForPage(pageId: number): Promise<SocialLinksByPosition> {
  const rows = await db
    .select()
    .from(links)
    .where(and(eq(links.pageId, pageId), eq(links.displayStyle, "icon")))
    .orderBy(asc(links.orderIndex));

  const top: SocialLinkItem[] = [];
  const bottom: SocialLinkItem[] = [];
  for (const row of rows) {
    const item = { id: row.id, icon: (row.icon ?? "").replace(/^brand:|^generic:/, ""), url: row.url };
    (row.iconPosition === "bottom" ? bottom : top).push(item);
  }
  return { top, bottom };
}

function reconcilePosition(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  pageId: number,
  position: IconPosition,
  items: SocialLinkItem[],
  existing: { id: number }[],
) {
  const keepIds = new Set(items.filter((item) => item.id).map((item) => item.id));
  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      tx.delete(links).where(eq(links.id, row.id)).run();
    }
  }

  items.forEach((item, index) => {
    // Value bisa "brand:xxx" (dari grid platform) atau "generic:Xxx" (dari picker custom) --
    // disimpen APA ADANYA (bukan selalu di-prefix "brand:") biar dua-duanya valid.
    const iconValue = item.icon.includes(":") ? item.icon : `brand:${item.icon}`;
    const brandId = iconValue.replace(/^brand:/, "");
    const title = BRAND_ICONS[brandId as keyof typeof BRAND_ICONS]?.title ?? item.icon;

    if (item.id) {
      tx.update(links)
        .set({ icon: iconValue, url: item.url, title, orderIndex: index, iconPosition: position })
        .where(eq(links.id, item.id))
        .run();
    } else {
      tx.insert(links)
        .values({
          pageId,
          groupId: null,
          title,
          url: item.url,
          description: null,
          displayStyle: "icon",
          icon: iconValue,
          linkType: "url",
          isActive: true,
          featured: false,
          orderIndex: index,
          iconPosition: position,
        })
        .run();
    }
  });
}

// Satu action nyimpen SEMUA state "Social Links" sekaligus (dua daftar independen top/
// bottom, plus toggle tampil/enggaknya) -- dipanggil langsung dari client component
// (bukan lewat <form action=...>) karena datanya berupa array dinamis.
export async function saveSocialLinksAction(
  pageId: number,
  top: SocialLinkItem[],
  bottom: SocialLinkItem[],
  showTop: boolean,
  showBottom: boolean,
): Promise<void> {
  const page = await requireOwnedPage(pageId);

  const existingRows = await db
    .select()
    .from(links)
    .where(and(eq(links.pageId, pageId), eq(links.displayStyle, "icon")));
  const existingTop = existingRows.filter((row) => row.iconPosition !== "bottom");
  const existingBottom = existingRows.filter((row) => row.iconPosition === "bottom");

  db.transaction((tx) => {
    reconcilePosition(tx, pageId, "top", top, existingTop);
    reconcilePosition(tx, pageId, "bottom", bottom, existingBottom);
  });

  const profile = parseProfileData(page.profileJson);
  const nextProfile = { ...profile, socialIconsShowTop: showTop, socialIconsShowBottom: showBottom };
  await db.update(pages).set({ profileJson: JSON.stringify(nextProfile) }).where(eq(pages.id, pageId));

  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
}
