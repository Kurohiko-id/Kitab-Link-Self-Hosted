import { DiscordWidget } from "@/components/discord-widget";
import type { DiscordWidgetRow } from "@/lib/db/discord-widget";
import type { ThemeTokens } from "@/lib/theme";
import type { PublicLocale } from "@/lib/public-i18n";

// Cuma masuk akal kalau ada ruang kosong kiri/kanan konten (desktop, layar lebar) -- di
// mobile konten udah mepet full-width, gak ada tempat buat nempelin ini, makanya "hidden
// lg:flex" (bukan cuma disembunyiin visual doang, biar gak ganggu tap area mobile juga).
const POSITION_CLASS: Record<string, string> = {
  "left-top": "left-4 top-4",
  "left-middle": "left-4 top-1/2 -translate-y-1/2",
  "left-bottom": "left-4 bottom-4",
  "right-top": "right-4 top-4",
  "right-middle": "right-4 top-1/2 -translate-y-1/2",
  "right-bottom": "right-4 bottom-4",
};

export function FloatingDiscordWidgets({
  widgets,
  theme,
  locale,
}: {
  widgets: DiscordWidgetRow[];
  theme: ThemeTokens;
  locale: PublicLocale;
}) {
  return (
    <>
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={`fixed z-20 hidden w-72 lg:flex ${POSITION_CLASS[widget.floatingPosition ?? "left-middle"]}`}
        >
          <DiscordWidget config={widget} theme={theme} locale={locale} />
        </div>
      ))}
    </>
  );
}
