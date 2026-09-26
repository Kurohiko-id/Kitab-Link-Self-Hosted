import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { discordWidgets } from "./schema";

export type DiscordWidgetRow = typeof discordWidgets.$inferSelect;

export async function getDiscordWidgetsForPage(pageId: number): Promise<DiscordWidgetRow[]> {
  return db.select().from(discordWidgets).where(eq(discordWidgets.pageId, pageId));
}

// Dipake buat render widget "inline" -- linkType discord_widget nyimpen id row ini di kolom
// url (lihat lib/link-render.ts parseDiscordWidgetId), dipanggil dari
// app/api/discord-widget-config/route.ts (route handler, bukan langsung dari LinkCard yang
// bisa ke-render client-side). Gak di-scope ke pageId -- data di tabel ini (guildId/style/
// toggle) bukan rahasia, semuanya emang buat ditampilin ke pengunjung publik.
export async function getDiscordWidgetById(id: number): Promise<DiscordWidgetRow | null> {
  const [row] = await db.select().from(discordWidgets).where(eq(discordWidgets.id, id)).limit(1);
  return row ?? null;
}

// Dipake public-page-body.tsx -- widget mode "floating" dirender LANGSUNG di situ (posisi
// tetap layar), beda dari mode "inline" yang nunggu ketemu link bertipe discord_widget.
export async function getFloatingDiscordWidgetsForPage(pageId: number): Promise<DiscordWidgetRow[]> {
  return db
    .select()
    .from(discordWidgets)
    .where(
      and(eq(discordWidgets.pageId, pageId), eq(discordWidgets.placementMode, "floating"), eq(discordWidgets.isEnabled, true)),
    );
}
