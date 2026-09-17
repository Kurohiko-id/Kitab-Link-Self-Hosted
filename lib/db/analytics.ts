import { and, count, eq, gte, inArray } from "drizzle-orm";
import { db } from "./index";
import { analyticsEvents, links, pages } from "./schema";
import type { LinkType } from "./board";

type EventMeta = { referrer?: string | null; deviceType?: "mobile" | "tablet" | "desktop"; country?: string | null };

// Non-blocking dengan sengaja (dipanggil dari render halaman publik/redirect klik) —
// gagal nyatet analytics gak boleh sampe bikin visitor gak jadi liat halaman/link-nya.
export function recordPageView(pageId: number, meta?: EventMeta) {
  db.insert(analyticsEvents)
    .values({ pageId, eventType: "page_view", ...meta })
    .catch((err) => console.error("[analytics] gagal catat page_view:", err));
}

export function recordLinkClick(pageId: number, linkId: number, meta?: EventMeta) {
  db.insert(analyticsEvents)
    .values({ pageId, eventType: "link_click", linkId, ...meta })
    .catch((err) => console.error("[analytics] gagal catat link_click:", err));
}

// Klik total (all-time) per link di SATU page -- dipakai buat nampilin angka klik
// langsung di baris link tab Links & Groups. GROUP BY di SQL, bukan JS, karena ini
// aggregate sederhana (beda sama getCrossPageAnalytics yang butuh bucketing per waktu).
export async function getLinkClickCounts(pageId: number): Promise<Record<number, number>> {
  const rows = await db
    .select({ linkId: analyticsEvents.linkId, clicks: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.pageId, pageId), eq(analyticsEvents.eventType, "link_click")))
    .groupBy(analyticsEvents.linkId);

  return Object.fromEntries(rows.filter((r) => r.linkId !== null).map((r) => [r.linkId as number, r.clicks]));
}

export type Period = "today" | "week" | "month" | "year";

export type ChartPoint = { label: string; views: number; clicks: number };
export type LinkRankRow = {
  linkId: number;
  title: string;
  icon: string | null;
  thumbnailPath: string | null;
  linkType: LinkType;
  url: string;
  pageId: number;
  pageSlug: string;
  clicks: number;
};
export type BreakdownRow = { label: string; count: number };
export type PageRankRow = { pageId: number; pageSlug: string; views: number; clicks: number };

export type CrossPageAnalytics = {
  totalViews: number;
  totalClicks: number;
  chartSeries: ChartPoint[];
  topLinks: LinkRankRow[];
  topPages: PageRankRow[];
  referrers: BreakdownRow[];
  devices: BreakdownRow[];
  countries: BreakdownRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const YEAR_LOOKBACK_MS = 366 * DAY_MS;

function periodStart(period: Period, now: Date): Date {
  if (period === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "week") return new Date(now.getTime() - 7 * DAY_MS);
  if (period === "month") return new Date(now.getTime() - 30 * DAY_MS);
  return new Date(now.getTime() - 365 * DAY_MS);
}

type RawEvent = {
  eventType: "page_view" | "link_click";
  pageId: number;
  linkId: number | null;
  referrer: string | null;
  deviceType: "mobile" | "tablet" | "desktop" | null;
  country: string | null;
  createdAt: Date;
};

// Agregasi dilakukan di JS (bukan raw SQL date-bucketing/GROUP BY) -> traffic skala
// project ini kecil (~10rb visitor/bulan per CLAUDE.md), dan satu query mentah + olah
// di memory jauh lebih portable ketimbang SQL tanggal-spesifik SQLite.
function buildChartSeries(events: RawEvent[], period: Period, now: Date): ChartPoint[] {
  if (period === "today") {
    const buckets = new Map<string, ChartPoint>();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * HOUR_MS);
      const label = `${String(d.getHours()).padStart(2, "0")}:00`;
      buckets.set(label, { label, views: 0, clicks: 0 });
    }
    const start = new Date(now.getTime() - 24 * HOUR_MS);
    for (const e of events) {
      if (e.createdAt < start) continue;
      const label = `${String(e.createdAt.getHours()).padStart(2, "0")}:00`;
      const bucket = buckets.get(label);
      if (!bucket) continue;
      if (e.eventType === "page_view") bucket.views++;
      else bucket.clicks++;
    }
    return Array.from(buckets.values());
  }

  if (period === "week" || period === "month") {
    const days = period === "week" ? 7 : 30;
    const buckets = new Map<string, ChartPoint>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { label: key.slice(5), views: 0, clicks: 0 });
    }
    const start = periodStart(period, now);
    for (const e of events) {
      if (e.createdAt < start) continue;
      const key = e.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (e.eventType === "page_view") bucket.views++;
      else bucket.clicks++;
    }
    return Array.from(buckets.values());
  }

  // year -> 12 kotak bulanan
  const buckets = new Map<string, ChartPoint>();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.set(key, { label: months[d.getMonth()], views: 0, clicks: 0 });
  }
  const start = periodStart("year", now);
  for (const e of events) {
    if (e.createdAt < start) continue;
    const key = `${e.createdAt.getFullYear()}-${e.createdAt.getMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (e.eventType === "page_view") bucket.views++;
    else bucket.clicks++;
  }
  return Array.from(buckets.values());
}

function buildBreakdown(
  events: RawEvent[],
  period: Period,
  now: Date,
  field: "referrer" | "deviceType" | "country",
  fallbackLabel: string,
): BreakdownRow[] {
  const start = periodStart(period, now);
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.eventType !== "page_view" || e.createdAt < start) continue;
    const key = e[field] ?? fallbackLabel;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

// Core bersama buat Overview (semua page user) dan tab Analytics (1 page doang) --
// bedanya cuma daftar page yang di-scan, logic agregasinya sama persis.
async function getAnalyticsForPages(
  pageEntries: { id: number; slug: string }[],
  chartPeriod: Period,
  linksPeriod: Period,
): Promise<CrossPageAnalytics> {
  const now = new Date();
  const pageIds = pageEntries.map((p) => p.id);

  if (pageIds.length === 0) {
    return {
      totalViews: 0,
      totalClicks: 0,
      chartSeries: buildChartSeries([], chartPeriod, now),
      topLinks: [],
      topPages: [],
      referrers: [],
      devices: [],
      countries: [],
    };
  }
  const slugByPageId = new Map(pageEntries.map((p) => [p.id, p.slug]));

  const sinceLookback = new Date(now.getTime() - YEAR_LOOKBACK_MS);
  const [events, linkRows] = await Promise.all([
    db
      .select({
        eventType: analyticsEvents.eventType,
        pageId: analyticsEvents.pageId,
        linkId: analyticsEvents.linkId,
        referrer: analyticsEvents.referrer,
        deviceType: analyticsEvents.deviceType,
        country: analyticsEvents.country,
        createdAt: analyticsEvents.createdAt,
      })
      .from(analyticsEvents)
      .where(and(inArray(analyticsEvents.pageId, pageIds), gte(analyticsEvents.createdAt, sinceLookback))),
    db
      .select({
        id: links.id,
        title: links.title,
        icon: links.icon,
        thumbnailPath: links.thumbnailPath,
        linkType: links.linkType,
        url: links.url,
        pageId: links.pageId,
      })
      .from(links)
      .where(inArray(links.pageId, pageIds)),
  ]);

  const totalViews = events.filter((e) => e.eventType === "page_view").length;
  const totalClicks = events.filter((e) => e.eventType === "link_click").length;

  const linkMeta = new Map(
    linkRows.map((l) => [
      l.id,
      {
        title: l.title,
        icon: l.icon,
        thumbnailPath: l.thumbnailPath,
        linkType: l.linkType,
        url: l.url,
        pageId: l.pageId,
        pageSlug: slugByPageId.get(l.pageId) ?? "?",
      },
    ]),
  );
  const linksStart = periodStart(linksPeriod, now);
  const clickCounts = new Map<number, number>();
  for (const e of events) {
    if (e.eventType !== "link_click" || !e.linkId || e.createdAt < linksStart) continue;
    clickCounts.set(e.linkId, (clickCounts.get(e.linkId) ?? 0) + 1);
  }
  const topLinks: LinkRankRow[] = Array.from(clickCounts.entries())
    .map(([linkId, clicks]) => {
      const meta = linkMeta.get(linkId);
      return meta
        ? {
            linkId,
            clicks,
            title: meta.title,
            icon: meta.icon,
            thumbnailPath: meta.thumbnailPath,
            linkType: meta.linkType,
            url: meta.url,
            pageId: meta.pageId,
            pageSlug: meta.pageSlug,
          }
        : null;
    })
    .filter((row): row is LinkRankRow => row !== null)
    .sort((a, b) => b.clicks - a.clicks);

  // Ranking per page (views+clicks) -- baru relevan pas Overview gabung lintas-page;
  // di tab Analytics (1 page doang) hasilnya cuma 1 baris, biarin aja UI yang milih tampilin apa nggak.
  const pageStats = new Map<number, { views: number; clicks: number }>();
  for (const e of events) {
    if (e.createdAt < linksStart) continue;
    const stat = pageStats.get(e.pageId) ?? { views: 0, clicks: 0 };
    if (e.eventType === "page_view") stat.views++;
    else stat.clicks++;
    pageStats.set(e.pageId, stat);
  }
  const topPages: PageRankRow[] = Array.from(pageStats.entries())
    .map(([pageId, stat]) => ({ pageId, pageSlug: slugByPageId.get(pageId) ?? "?", ...stat }))
    .sort((a, b) => b.views - a.views);

  return {
    totalViews,
    totalClicks,
    chartSeries: buildChartSeries(events, chartPeriod, now),
    topLinks,
    topPages,
    referrers: buildBreakdown(events, chartPeriod, now, "referrer", "Direct"),
    devices: buildBreakdown(events, chartPeriod, now, "deviceType", "Unknown"),
    countries: buildBreakdown(events, chartPeriod, now, "country", "Unknown"),
  };
}

// Dipakai tab Overview -> analytics gabungan dari SEMUA page milik user (bukan cuma
// page yang lagi aktif), karena Overview jadi pusat analytics lintas-page.
export async function getCrossPageAnalytics(
  userId: number,
  chartPeriod: Period,
  linksPeriod: Period,
): Promise<CrossPageAnalytics> {
  const userPages = await db.select({ id: pages.id, slug: pages.slug }).from(pages).where(eq(pages.userId, userId));
  return getAnalyticsForPages(userPages, chartPeriod, linksPeriod);
}

// Dipakai tab Analytics -> sama persis logicnya, tapi di-scope ke SATU page aktif aja.
export async function getPageAnalytics(
  pageId: number,
  pageSlug: string,
  chartPeriod: Period,
  linksPeriod: Period,
): Promise<CrossPageAnalytics> {
  return getAnalyticsForPages([{ id: pageId, slug: pageSlug }], chartPeriod, linksPeriod);
}
