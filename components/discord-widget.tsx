import { fetchDiscordWidgetData } from "@/lib/discord-widget";
import { DiscordWidgetCard } from "@/components/discord-widget-card";
import { DiscordIframe } from "@/components/discord-iframe";
import type { DiscordWidgetRow } from "@/lib/db/discord-widget";
import type { ThemeTokens } from "@/lib/theme";
import { getPublicDictionary, type PublicLocale } from "@/lib/public-i18n";

// Server Component, dipakai buat widget mode "floating" (public-page-body.tsx tau langsung
// row DB-nya). Mode "inline" (linkType discord_widget) lewat DiscordWidgetLinkCard (client)
// soalnya link-card.tsx bisa ke-reach dari preview dashboard yang client-side -- komponen
// async gak bisa dipanggil dari situ, lihat komentar di discord-widget-link-card.tsx.
// Data-nya fresh tiap request (revalidate 60s di fetchDiscordWidgetData), gak ada polling
// client-side, cukup ngikut refresh halaman biasa.
export async function DiscordWidget({
  config,
  theme,
  locale,
}: {
  config: DiscordWidgetRow;
  theme: ThemeTokens;
  locale: PublicLocale;
}) {
  // Style "iframe" gak butuh widget.json sama sekali -- skip fetch-nya, langsung iframe.
  if (config.style === "iframe") return <DiscordIframe guildId={config.guildId} />;

  const t = getPublicDictionary(locale);
  const data = await fetchDiscordWidgetData(config.guildId);
  // Widget dimatiin di sisi Discord-nya / ID salah -- diem aja, jangan bikin halaman
  // publik keliatan rusak gara-gara satu widget gagal fetch.
  if (!data) return null;

  return <DiscordWidgetCard data={data} config={config} theme={theme} t={t} />;
}
