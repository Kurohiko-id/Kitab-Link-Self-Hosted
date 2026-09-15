import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";

const CHECK_TIMEOUT_MS = 8000;
// Ditandai "dead" cuma setelah gagal 2x BERTURUT-TURUT (bukan sekali) -- network blip
// sesaat gak boleh langsung nge-flag link yang sebenernya sehat.
const FAILURE_THRESHOLD = 2;
const USER_AGENT = "Mozilla/5.0 (compatible; KitabLinkBot/1.0; +link-health-check)";

async function pingUrl(url: string): Promise<boolean> {
  const options = { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) };
  try {
    // HEAD dulu (hemat bandwidth) -- sebagian server nolak/gak dukung HEAD (405/403),
    // baru fallback ke GET beneran buat server yang begitu.
    let res = await fetch(url, { method: "HEAD", redirect: "follow", ...options });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, { method: "GET", redirect: "follow", ...options });
    }
    return res.ok;
  } catch {
    return false;
  }
}

// Dipanggil cron sekali sehari (lihat instrumentation.ts) -- cuma linkType "url" yang
// dicek (email/phone/whatsapp/file/embed/copy bukan http(s) yang bisa di-ping generik).
export async function checkDeadLinks(): Promise<void> {
  const rows = await db.select().from(links).where(and(eq(links.linkType, "url"), eq(links.isActive, true)));

  for (const link of rows) {
    const alive = await pingUrl(link.url);
    const consecutiveFailures = alive ? 0 : link.consecutiveFailures + 1;
    const lastCheckStatus = consecutiveFailures >= FAILURE_THRESHOLD ? "dead" : "ok";

    await db
      .update(links)
      .set({ lastCheckedAt: new Date(), lastCheckStatus, consecutiveFailures })
      .where(eq(links.id, link.id));
  }
}
