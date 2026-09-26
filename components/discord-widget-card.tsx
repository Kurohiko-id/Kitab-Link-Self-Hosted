import type { CSSProperties } from "react";
import { Volume2 } from "lucide-react";
import type { DiscordWidgetData, DiscordWidgetMember } from "@/lib/discord-widget";
import type { ThemeTokens } from "@/lib/theme";
import type { PublicDictionary } from "@/lib/public-i18n";

const STATUS_COLOR: Record<string, string> = {
  online: "#23a55a",
  idle: "#f0b232",
  dnd: "#f23f43",
};

// "discord" -- warna brand Discord asli (dark theme-nya), gak ngikut theme page sama
// sekali. "custom" dihitung dari ThemeTokens per-page (lihat paletteFor). "classic" gak
// pake palette ini -- layout-nya sendiri niru tampilan iframe premade Discord asli
// (header ungu blurple + kolom channel/member), lihat ClassicDiscordWidget di bawah.
// "iframe" gak pernah nyampe ke komponen ini -- di-short-circuit di pemanggil (DiscordWidget/
// DiscordWidgetLinkCard) SEBELUM fetch widget.json, soalnya <iframe> Discord asli gak butuh
// data itu sama sekali. Tetep masuk union type di sini biar DiscordWidgetRow (4 style) cocok
// struktural-nya, guard di awal DiscordWidgetCard cuma jaga-jaga.
const DISCORD_BRAND_PALETTE = { bg: "#2b2d31", border: "#1e1f22", text: "#f2f3f5", buttonBg: "#5865f2", buttonText: "#ffffff" };
const BLURPLE = "#5865f2";

export type DiscordWidgetDisplayConfig = {
  style: "custom" | "discord" | "classic" | "iframe";
  title: string | null;
  showMemberCount: boolean;
  showAvatars: boolean;
  showVoiceChannels: boolean;
  showJoinButton: boolean;
  width: number | null;
  height: number | null;
};

// null (auto) = gak nambahin apa-apa. Diisi = width/maxWidth (biar gak jebol keluar
// container inline yang lebih sempit dari widget).
function widthStyle(width: number | null): CSSProperties {
  return width ? { width, maxWidth: "100%" } : {};
}

// Height diisi -> BUKAN bikin card di-scroll (Join Server jadi ketutup di bawah scroll,
// gak sesuai ekspektasi user) -- daftar channel/member yang dipendekin duluan biar card
// beneran pas setinggi itu tanpa scrollbar. Konstanta di bawah ngikut padding/line-height
// class Tailwind yang DIPAKE BENERAN di kartu (row-nya dijamin 1 baris karena semua pake
// `truncate`, gak pernah wrap) -- kalau class-nya diubah, angka ini ikut disesuain manual
// (gak ada pengukuran DOM beneran, komponen ini Server Component/gak ada ResizeObserver).
function maxRowsForHeight(height: number | null, fixedCost: number, rowHeight: number, fallback: number): number {
  if (!height) return fallback;
  return Math.max(0, Math.floor((height - fixedCost) / rowHeight));
}

function paletteFor(style: "custom" | "discord", theme: ThemeTokens) {
  if (style === "discord") return DISCORD_BRAND_PALETTE;
  return { bg: theme.cardBackground, border: theme.cardBorder, text: theme.text, buttonBg: theme.cardBorder, buttonText: theme.buttonText };
}

// Avatar + titik status online -- dot-nya HARUS di LUAR wrapper "overflow-hidden rounded-full"
// punya gambar avatar, bukan di dalemnya. Sebelumnya dot ini nempel di dalam wrapper yang
// sama, jadi ke-crop sama mask lingkaran punya avatar (keliatan kepotong sabit di pojoknya,
// bukan bulet penuh) -- itu penyebab "border aneh" yang dilaporkan.
function AvatarWithStatus({ member, size, ringColor }: { member: DiscordWidgetMember; size: string; ringColor: string }) {
  return (
    <span className={`relative ${size} shrink-0`}>
      <span className="block size-full overflow-hidden rounded-full">
        {member.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar dari CDN Discord, bukan aset lokal
          <img src={member.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center bg-black/20 text-[10px] font-medium">
            {member.username.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span
        className="absolute right-0 bottom-0 size-2.5 rounded-full border-2"
        style={{ backgroundColor: STATUS_COLOR[member.status] ?? "#6b7280", borderColor: ringColor }}
      />
    </span>
  );
}

// Presentational MURNI (gak ada fetch/db) -- sengaja dipisah dari DiscordWidget (server,
// dipakai buat mode "floating") supaya bisa DIPAKAI ULANG dari DiscordWidgetLinkCard (client,
// dipakai buat mode "inline" lewat linkType discord_widget) tanpa duplikasi JSX. Fungsi
// biasa gak ada async/"use client" sendiri -- aman dipanggil dari komponen server MAUPUN
// client, karena isinya cuma JSX+data yang udah di-resolve pemanggilnya.
export function DiscordWidgetCard({
  data,
  config,
  theme,
  t,
}: {
  data: DiscordWidgetData;
  config: DiscordWidgetDisplayConfig;
  theme: ThemeTokens;
  t: PublicDictionary;
}) {
  if (config.style === "classic") return <ClassicDiscordWidget data={data} config={config} t={t} />;
  const style = config.style === "iframe" ? "custom" : config.style;

  const palette = paletteFor(style, theme);
  const shownMembers = config.showAvatars ? data.members.slice(0, 8) : [];
  const extraCount = config.showAvatars ? Math.max(0, data.members.length - shownMembers.length) : 0;

  // Cuma daftar channel yang tingginya bisa berubah-ubah (header/avatar row/tombol join
  // tingginya udah fix) -- itu doang yang dipendekin kalau height dibatasi.
  const hasAvatarRow = config.showAvatars && shownMembers.length > 0;
  const hasButton = config.showJoinButton && !!data.instantInvite;
  const hasChannels = config.showVoiceChannels && data.channels.length > 0;
  const sectionCount = 1 + (hasAvatarRow ? 1 : 0) + (hasChannels ? 1 : 0) + (hasButton ? 1 : 0);
  const fixedNonChannelHeight =
    32 /* p-4 */ + 24 /* header row */ + (hasAvatarRow ? 32 : 0) /* size-8 avatar row */ + (hasButton ? 36 : 0) /* join button */ +
    Math.max(0, sectionCount - 1) * 12 /* gap-3 antar section */;
  const shownChannels = hasChannels ? data.channels.slice(0, maxRowsForHeight(config.height, fixedNonChannelHeight, 20, data.channels.length)) : [];

  return (
    <div
      className="flex w-full flex-col gap-3 rounded-2xl border p-4"
      style={{ backgroundColor: palette.bg, borderColor: palette.border, color: palette.text, ...widthStyle(config.width) }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{config.title || data.name}</span>
        {config.showMemberCount ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs opacity-70">
            <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLOR.online }} />
            {t.discordOnline(data.presenceCount)}
          </span>
        ) : null}
      </div>

      {config.showAvatars && shownMembers.length > 0 ? (
        <div className="flex items-center">
          {shownMembers.map((member, i) => (
            <span
              key={member.id}
              title={member.username}
              className="-ml-2 rounded-full border-2 first:ml-0"
              style={{ borderColor: palette.bg, zIndex: shownMembers.length - i }}
            >
              <AvatarWithStatus member={member} size="size-8" ringColor={palette.bg} />
            </span>
          ))}
          {extraCount > 0 ? (
            <span
              className="relative -ml-2 flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-black/20 text-[10px] font-medium"
              style={{ borderColor: palette.bg }}
            >
              +{extraCount}
            </span>
          ) : null}
        </div>
      ) : null}

      {shownChannels.length > 0 ? (
        <div className="flex flex-col gap-1 text-xs opacity-80">
          {shownChannels.map((channel) => (
            <span key={channel.id} className="truncate">
              🔊 {channel.name}
            </span>
          ))}
        </div>
      ) : null}

      {config.showJoinButton && data.instantInvite ? (
        <a
          href={data.instantInvite}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: palette.buttonBg, color: palette.buttonText }}
        >
          {t.discordJoinServer}
        </a>
      ) : null}
    </div>
  );
}

// Niru layout iframe premade Discord asli (header ungu blurple + "X Members Online",
// kolom channel di kiri, kolom member online di kanan) -- BUKAN cuma ganti warna kayak
// style "discord", tapi struktur/tata letaknya sendiri beda dari style lain.
function ClassicDiscordWidget({
  data,
  config,
  t,
}: {
  data: DiscordWidgetData;
  config: DiscordWidgetDisplayConfig;
  t: PublicDictionary;
}) {
  const hasFooter = config.showJoinButton && !!data.instantInvite;
  const fixedCost = 48 /* header px-4 py-3 */ + 32 /* content p-4 */ + (hasFooter ? 41 : 0) /* footer */;
  const maxChannelRows = maxRowsForHeight(config.height, fixedCost, 26 /* row text-sm + gap-1.5 */, data.channels.length);
  const shownChannels = config.showVoiceChannels ? data.channels.slice(0, maxChannelRows) : [];

  const memberLabelHeight = config.showAvatars ? 22 /* "MEMBERS ONLINE" label + gap-2 */ : 0;
  const maxMemberRows = maxRowsForHeight(config.height, fixedCost + memberLabelHeight, 32 /* row size-6 avatar + gap-2 */, 10);
  const shownMembers = config.showAvatars ? data.members.slice(0, Math.min(10, maxMemberRows)) : [];

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-2xl border"
      style={{ borderColor: "#1e1f22", ...widthStyle(config.width) }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ backgroundColor: BLURPLE, color: "#ffffff" }}>
        <span className="truncate font-bold">{config.title || data.name}</span>
        {config.showMemberCount ? <span className="shrink-0 text-xs font-medium opacity-90">{t.discordOnline(data.presenceCount)}</span> : null}
      </div>
      <div className="flex gap-4 p-4" style={{ backgroundColor: "#2b2d31", color: "#f2f3f5" }}>
        {shownChannels.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {shownChannels.map((channel) => (
              <span key={channel.id} className="flex min-w-0 items-center gap-1.5 text-sm opacity-80">
                <Volume2 className="size-3.5 shrink-0" />
                <span className="truncate">{channel.name}</span>
              </span>
            ))}
          </div>
        ) : null}
        {config.showAvatars && shownMembers.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-[10px] font-bold tracking-wide opacity-50 uppercase">{t.discordMembersOnline}</span>
            {shownMembers.map((member) => (
              <div key={member.id} className="flex min-w-0 items-center gap-2 text-sm">
                <AvatarWithStatus member={member} size="size-6" ringColor="#2b2d31" />
                <span className="min-w-0 flex-1 truncate opacity-90">{member.username}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {config.showJoinButton && data.instantInvite ? (
        <a
          href={data.instantInvite}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 text-center text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: "#232428", color: BLURPLE }}
        >
          {t.discordJoinServer}
        </a>
      ) : null}
    </div>
  );
}
