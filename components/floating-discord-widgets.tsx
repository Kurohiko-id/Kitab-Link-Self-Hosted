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

// "classic" render 2 kolom (channel + member) berdampingan -- w-72 (288px) yang cukup
// buat style lain jadi kepotong/truncate parah di situ (issue #5 report). Style lain tetep
// w-72 biar posisi floating gak geser drastis dari sebelumnya.
function widthClassFor(style: string): string {
  return style === "classic" ? "w-96" : "w-72";
}

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
          className={`fixed z-20 hidden ${widget.width ? "" : widthClassFor(widget.style)} lg:flex ${POSITION_CLASS[widget.floatingPosition ?? "left-middle"]}`}
          style={widget.width ? { width: widget.width, maxWidth: "100%" } : undefined}
        >
          <DiscordWidget config={widget} theme={theme} locale={locale} />
        </div>
      ))}
    </>
  );
}
