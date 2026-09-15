import { and, asc, eq } from "drizzle-orm";
import { db } from "./index";
import { linkGroups, links, pages } from "./schema";

export type DisplayStyle = "pill" | "rich" | "icon";
export type LinkType = "url" | "email" | "phone" | "whatsapp" | "file" | "embed" | "copy" | "accordion";
export type IconPosition = "top" | "bottom";

export type BoardLink = {
  id: number;
  groupId: number | null;
  title: string;
  url: string;
  description: string | null;
  isActive: boolean;
  thumbnailPath: string | null;
  displayStyle: DisplayStyle;
  icon: string | null;
  linkType: LinkType;
  featured: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  iconPosition: IconPosition;
};

export type BoardGroup = {
  id: number;
  name: string;
  isVisible: boolean;
  links: BoardLink[];
};

export type BoardData = {
  groups: BoardGroup[];
  ungrouped: BoardLink[];
};

export async function getBoardData(pageId: number): Promise<BoardData> {
  const [groupRows, linkRows] = await Promise.all([
    db
      .select()
      .from(linkGroups)
      .where(eq(linkGroups.pageId, pageId))
      .orderBy(asc(linkGroups.orderIndex)),
    db.select().from(links).where(eq(links.pageId, pageId)).orderBy(asc(links.orderIndex)),
  ]);

  const groups: BoardGroup[] = groupRows.map((group) => ({
    id: group.id,
    name: group.name,
    isVisible: group.isVisible,
    links: [],
  }));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const ungrouped: BoardLink[] = [];

  for (const link of linkRows) {
    // displayStyle "icon" = baris icon sosmed, dikelola sendiri lewat Profile > Social
    // Links (lihat social-links-actions.ts), bukan bagian dari list link biasa -> jangan
    // ikut ditampilin di board Links & Groups (sesuai hint di link-form-modal.tsx).
    if (link.displayStyle === "icon") continue;

    const entry: BoardLink = {
      id: link.id,
      groupId: link.groupId,
      title: link.title,
      url: link.url,
      description: link.description,
      isActive: link.isActive,
      thumbnailPath: link.thumbnailPath,
      displayStyle: link.displayStyle,
      icon: link.icon,
      linkType: link.linkType,
      featured: link.featured,
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
      iconPosition: link.iconPosition,
    };
    const group = link.groupId !== null ? groupById.get(link.groupId) : undefined;
    if (group) {
      group.links.push(entry);
    } else {
      ungrouped.push(entry);
    }
  }

  return { groups, ungrouped };
}

export type SearchableLink = { id: number; title: string; pageId: number; pageSlug: string };

// Buat search bar dashboard (lihat components/dashboard-search.tsx) -- lintas SEMUA
// page milik user, bukan cuma page yang lagi aktif, sesuai permintaan user.
export async function getAllLinksForUser(userId: number): Promise<SearchableLink[]> {
  const rows = await db
    .select({ id: links.id, title: links.title, pageId: links.pageId, pageSlug: pages.slug })
    .from(links)
    .innerJoin(pages, eq(links.pageId, pages.id))
    .where(eq(pages.userId, userId));
  return rows;
}

export type PublicLink = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  thumbnailPath: string | null;
  displayStyle: DisplayStyle;
  icon: string | null;
  linkType: LinkType;
  featured: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  iconPosition: IconPosition;
};
export type PublicGroup = { id: number; name: string; links: PublicLink[] };
export type PublicBoardData = { groups: PublicGroup[]; ungrouped: PublicLink[] };

// Dipakai halaman publik: hanya group yang is_visible dan link yang is_active.
// Link yang groupnya di-hide ikut tersembunyi (bukan jatuh ke ungrouped).
export async function getPublicBoardData(pageId: number): Promise<PublicBoardData> {
  const [groupRows, linkRows] = await Promise.all([
    db
      .select()
      .from(linkGroups)
      .where(and(eq(linkGroups.pageId, pageId), eq(linkGroups.isVisible, true)))
      .orderBy(asc(linkGroups.orderIndex)),
    db
      .select()
      .from(links)
      .where(and(eq(links.pageId, pageId), eq(links.isActive, true)))
      .orderBy(asc(links.orderIndex)),
  ]);

  const groups: PublicGroup[] = groupRows.map((group) => ({ id: group.id, name: group.name, links: [] }));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const ungrouped: PublicLink[] = [];

  for (const link of linkRows) {
    const entry: PublicLink = {
      id: link.id,
      title: link.title,
      url: link.url,
      description: link.description,
      thumbnailPath: link.thumbnailPath,
      displayStyle: link.displayStyle,
      icon: link.icon,
      linkType: link.linkType,
      featured: link.featured,
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
      iconPosition: link.iconPosition,
    };
    if (link.groupId === null) {
      ungrouped.push(entry);
      continue;
    }
    groupById.get(link.groupId)?.links.push(entry);
  }

  return { groups, ungrouped };
}
