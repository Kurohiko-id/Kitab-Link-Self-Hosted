import Parser from "rss-parser";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentFeeds, links } from "@/lib/db/schema";
import { processImage } from "@/lib/images/process-image";
import { saveImage } from "@/lib/images/storage";
import { logActivity } from "@/lib/db/activity-log";

// Batasi berapa item baru yang dibikinin link sekaligus per cek -- feed yang lama gak
// pernah dicek (atau ganti total isinya) gak boleh nge-flood puluhan link sekaligus.
const MAX_NEW_ITEMS_PER_RUN = 5;

type FeedItem = Parser.Item & {
  // Custom fields buat YouTube Atom (media:group->media:thumbnail) dan RSS generik
  // (media:thumbnail langsung) -- shape xml2js dinamis, makanya unknown + narrowing manual.
  mediaGroup?: Record<string, unknown>;
  mediaThumbnail?: Record<string, unknown>;
};

const parser = new Parser<Record<string, unknown>, FeedItem>({
  timeout: 8000,
  customFields: {
    // Rename tag XML -> nama properti di object item (lihat FeedItem di atas).
    item: [
      ["media:group", "mediaGroup"],
      ["media:thumbnail", "mediaThumbnail"],
    ],
  },
});

type ContentFeedRow = typeof contentFeeds.$inferSelect;

function itemKey(item: FeedItem): string {
  return item.guid || item.link || item.title || "";
}

// xml2js taruh atribut XML di key "$" (mis. <media:thumbnail url="X"/> -> {$: {url: "X"}}).
// media:group bisa berisi array media:thumbnail (YouTube Atom); RSS generik biasanya cuma
// satu media:thumbnail langsung di item, bukan di dalam grup.
function extractThumbnailUrl(item: FeedItem): string | null {
  const fromGroup = item.mediaGroup?.["media:thumbnail"];
  const groupThumb = Array.isArray(fromGroup) ? fromGroup[0] : fromGroup;
  const groupUrl = (groupThumb as { $?: { url?: string } } | undefined)?.$?.url;
  if (groupUrl) return groupUrl;

  const direct = item.mediaThumbnail;
  const directThumb = Array.isArray(direct) ? direct[0] : direct;
  const directUrl = (directThumb as { $?: { url?: string } } | undefined)?.$?.url;
  if (directUrl) return directUrl;

  if (item.enclosure?.url && (item.enclosure.type ?? "").startsWith("image/")) return item.enclosure.url;
  return null;
}

const MAX_THUMBNAIL_WIDTH = 800;

async function tryFetchThumbnail(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const webp = await processImage(buffer, MAX_THUMBNAIL_WIDTH);
    return await saveImage(webp, "link-thumbnails");
  } catch {
    return null; // Rich card tetap dibikin, cuma tanpa gambar -- bukan alasan buat skip seluruh item.
  }
}

async function processSingleFeed(feed: ContentFeedRow) {
  const parsed = await parser.parseURL(feed.feedUrl);
  const items = parsed.items ?? [];
  if (items.length === 0) return;

  // Cek pertama kali -- rekam baseline doang, JANGAN backfill seluruh isi feed lama
  // sekaligus (user cuma mau notifikasi upload BARU ke depannya, bukan import histori).
  if (!feed.lastItemGuid) {
    await db
      .update(contentFeeds)
      .set({ lastItemGuid: itemKey(items[0]), lastCheckedAt: new Date() })
      .where(eq(contentFeeds.id, feed.id));
    return;
  }

  const lastIndex = items.findIndex((it) => itemKey(it) === feed.lastItemGuid);
  const newItems = (lastIndex === -1 ? items : items.slice(0, lastIndex)).slice(0, MAX_NEW_ITEMS_PER_RUN);

  if (newItems.length > 0) {
    const existingOrders = await db
      .select({ orderIndex: links.orderIndex })
      .from(links)
      .where(eq(links.groupId, feed.groupId));
    let nextOrder = existingOrders.length > 0 ? Math.min(...existingOrders.map((r) => r.orderIndex)) - 1 : 0;

    // Diproses dari yang paling lama ke paling baru -> item paling baru diinsert TERAKHIR
    // dengan orderIndex terkecil, jadi nangkring paling atas grup.
    for (const item of [...newItems].reverse()) {
      const thumbnailPath = feed.richPreview ? await tryFetchThumbnail(extractThumbnailUrl(item) ?? "") : null;

      const title = item.title || "Untitled";
      await db.insert(links).values({
        pageId: feed.pageId,
        groupId: feed.groupId,
        orderIndex: nextOrder,
        title,
        url: item.link || "",
        description: feed.richPreview ? (item.contentSnippet?.slice(0, 200) ?? null) : null,
        displayStyle: feed.richPreview ? "rich" : "pill",
        thumbnailPath,
        linkType: "url",
        isActive: true,
      });
      logActivity(feed.pageId, "link_created", title, "automation", feed.label || "RSS/Atom Feed");
      nextOrder -= 1;
    }
  }

  await db
    .update(contentFeeds)
    .set({ lastItemGuid: itemKey(items[0]), lastCheckedAt: new Date() })
    .where(eq(contentFeeds.id, feed.id));
}

// Dipanggil cron tiap ~15 menit (lihat instrumentation.ts).
export async function processContentFeeds(): Promise<void> {
  const feeds = await db.select().from(contentFeeds).where(eq(contentFeeds.isActive, true));
  for (const feed of feeds) {
    try {
      await processSingleFeed(feed);
    } catch (err) {
      console.error(`[content-feeds] gagal proses feed ${feed.id} (${feed.feedUrl}):`, err);
    }
  }
}

// Dipanggil dari server action pas user nambah feed baru -- validasi URL-nya beneran
// feed yang bisa di-parse sebelum disimpen, biar gak nyimpen config yang bakal selalu gagal.
export async function validateFeedUrl(feedUrl: string): Promise<{ ok: true; title: string } | { ok: false }> {
  try {
    const parsed = await parser.parseURL(feedUrl);
    return { ok: true, title: parsed.title ?? feedUrl };
  } catch {
    return { ok: false };
  }
}

