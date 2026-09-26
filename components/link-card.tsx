import { cn } from "@/lib/utils";
import { LinkIconRenderer } from "@/components/link-icon";
import { CopiedCheckIcon, CopyLinkButton } from "@/components/copy-link-button";
import { AccordionLinkCard } from "@/components/accordion-link-card";
import { CountdownLinkCard } from "@/components/countdown-link-card";
import { DiscordWidgetLinkCard } from "@/components/discord-widget-link-card";
import { YoutubeFacade } from "@/components/youtube-facade";
import {
  getButtonAlignClass,
  getButtonHoverClass,
  getCardStyle,
  getEntranceClass,
  getSocialIconShapeClass,
  getSocialIconStyle,
  type ThemeTokens,
} from "@/lib/theme";
import type { PublicLink } from "@/lib/db/board";
import { getLinkHref, parseAccordionItems, parseCountdownData, parseDiscordWidgetId, extractYoutubeId } from "@/lib/link-render";
import { brandIconForUrl } from "@/lib/icons";
import type { PublicLocale } from "@/lib/public-i18n";

// Dipakai di halaman publik (app/[slug]/page.tsx) DAN preview dashboard (theme-editor.tsx)
// -> satu sumber kebenaran buat rendering link, biar shape/surface/hover/icon-position
// gak pernah beda antara apa yang di-edit dan apa yang beneran tampil ke visitor.

// Favicon lookup cuma masuk akal buat link type "url" (host asli) -> type lain (email/
// phone/whatsapp/file/embed) dikasih icon generic bawaan yang cocok kalau user gak pilih
// icon manual sendiri.
const DEFAULT_ICON_BY_TYPE: Partial<Record<PublicLink["linkType"], string>> = {
  email: "generic:Mail",
  phone: "generic:Phone",
  whatsapp: "brand:whatsapp",
  file: "generic:Download",
  embed: "generic:Play",
  copy: "generic:Clipboard",
  countdown: "generic:Timer",
  discord_widget: "brand:discord",
};

function faviconUrl(pageUrl: string): string | null {
  try {
    const host = new URL(pageUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return null;
  }
}

// Icon manual (kalau di-set di dashboard) diprioritaskan; abis itu thumbnail (kalau ada,
// dipake versi kecil sebagai glyph di posisi icon -- BUKAN cuma buat displayStyle "rich"
// lagi); baru fallback ke default per-type, lalu brand icon by domain (chat.whatsapp.com,
// discord.gg, dst -- banyak yang gak punya favicon keindex Google, cuma nongol globe kalau
// lompat langsung ke favicon), terakhir favicon otomatis buat sisanya.
//
// Cuma minta 4 field ini (bukan PublicLink penuh) -- dipakai juga di tempat yang gak punya
// data link SELENGKAP itu (board.tsx list drag-drop, overview-links-table.tsx ranking klik),
// biar gak perlu ngarang field kosong yang gak relevan cuma buat cocokin tipe.
type GlyphSource = Pick<PublicLink, "icon" | "thumbnailPath" | "linkType" | "url">;
export function LinkGlyph({ link, className = "size-5 shrink-0" }: { link: GlyphSource; className?: string }) {
  if (link.icon) {
    return <LinkIconRenderer value={link.icon} className={className} />;
  }
  if (link.thumbnailPath) {
    // eslint-disable-next-line @next/next/no-img-element -- gambar sudah diproses jadi webp sendiri, bukan kandidat next/image
    return <img src={`/uploads/${link.thumbnailPath}`} alt="" className={cn(className, "rounded-md object-cover")} />;
  }
  const defaultIcon = DEFAULT_ICON_BY_TYPE[link.linkType];
  if (defaultIcon) {
    return <LinkIconRenderer value={defaultIcon} className={className} />;
  }
  const brand = brandIconForUrl(link.url);
  if (brand) {
    return <LinkIconRenderer value={`brand:${brand}`} className={className} />;
  }
  const favicon = faviconUrl(link.url);
  if (!favicon) return null;
  // eslint-disable-next-line @next/next/no-img-element -- favicon pihak ketiga, bukan aset lokal
  return <img src={favicon} alt="" className={className} />;
}

export function LinkCard({
  link,
  theme,
  index,
  locale = "en",
}: {
  link: PublicLink;
  theme: ThemeTokens;
  index: number;
  locale?: PublicLocale;
}) {
  // borderRadius/borderWidth/boxShadow/backdropFilter semua diatur lewat buttonStyle
  // (dari theme, bukan hardcoded per displayStyle lagi) -> shape/surface tombol full
  // dikontrol dari dashboard. Featured nambah ring lebih TEBEL warna theme.cardBorder
  // (bukan warna fixed) + background sedikit lebih terang -- dimix pake color-mix() dari
  // cardBackground THEME ITU SENDIRI (bukan warna ungu hardcode), jadi tetep nyambung ke
  // palet theme apapun (japanese wave tetep biru-navy terang, bukan ikut jadi ungu).
  const buttonStyle = {
    ...getCardStyle(theme),
    ...({ "--kl-index": index, "--kl-glow-color": theme.cardBorder } as React.CSSProperties),
    ...(link.featured
      ? {
          boxShadow: `0 0 0 3px ${theme.cardBorder}`,
          backgroundColor: `color-mix(in srgb, ${theme.cardBackground} 80%, white 20%)`,
        }
      : {}),
  };
  const sharedClassName = cn(
    // active:opacity-80 -- feedback tekan buat HP (tap-highlight bawaan browser udah
    // dimatiin di globals.css karena warnanya gak ngikutin theme). transition-opacity
    // biar transisinya halus, bukan langsung "patah". outline-none + focus-visible:outline --
    // browser (terutama Safari iOS) nampilin default focus ring pas link di-tap/hold, bukan
    // cuma pas keyboard-nav -- :focus-visible matiin itu buat tap/klik mouse, tapi tetep
    // nongol pas navigasi keyboard (Tab), jadi aksesibilitas gak ilang. select-none -- long-
    // press di teks tombol biasanya kepicu native text-selection HP (kotak gelap ngelilingin
    // teks) -- gak masuk akal orang mau nge-select judul link, ini tombol navigasi.
    "outline-none transition-opacity select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80",
    getButtonHoverClass(theme),
    getEntranceClass(theme),
    // scale-[1.045] + ring 3px (boxShadow) featured dua-duanya CSS transform/box-shadow --
    // gak ngaruh ke ukuran box di layout flow, jadi visualnya "makan" ke gap-2 flex antar
    // link (keliatan mepet ke link di bawahnya). my-1.5 nambahin jarak ekstra biar gak nabrak.
    link.featured && "relative z-[1] my-1.5 scale-[1.045]",
  );
  const alignClass = getButtonAlignClass(theme);
  // "edge-*" dorong icon ke ujung tombol (justify-between, teks tetap ngikut alignClass);
  // "left"/"right" biasa nempel bareng teks sebagai satu grup (urutan icon vs teks dibalik).
  // Dihitung di sini (bukan cuma di bawah buat tombol biasa) soalnya accordion JUGA butuh
  // dua ini -- headernya harus ngikut alignment/posisi icon theme yang sama, bukan hardcode
  // justify-between + icon selalu di kiri kayak sebelumnya.
  const isEdge = theme.linkIconPosition === "edge-left" || theme.linkIconPosition === "edge-right";
  const iconFirst = theme.linkIconPosition === "left" || theme.linkIconPosition === "edge-left";
  const linkHref = getLinkHref(link);
  // Klik nembak ke sini dulu (bukan langsung ke URL asli) -> analytics klik ke-catat
  // sebelum di-redirect ke tujuan sebenarnya, lihat app/r/[linkId]/route.ts.
  const clickHref = `/r/${link.id}`;

  // Discord Widget -- bukan link (gak ada "klik buka sesuatu"), langsung render kartu
  // widget-nya di posisi ini, sama kayak accordion/countdown gak peduliin displayStyle.
  if (link.linkType === "discord_widget") {
    return <DiscordWidgetLinkCard widgetId={parseDiscordWidgetId(link.url)} theme={theme} locale={locale} />;
  }

  // Countdown -- gak bisa diklik sebelum endsAt lewat, jadi dicek DULUAN sebelum displayStyle
  // "icon" (gak masuk akal buat state "nonaktif sementara" ini). "rich" TETEP didukung (lihat
  // CountdownLinkCard) -- thumbnail besar + countdown di sebelah judul, sisanya (pill/icon)
  // selalu render sebagai bar biasa, sama kayak accordion di bawah.
  if (link.linkType === "countdown") {
    return (
      <CountdownLinkCard
        title={link.title}
        description={link.description}
        thumbnailPath={link.thumbnailPath}
        data={parseCountdownData(link.url)}
        clickHref={clickHref}
        buttonStyle={buttonStyle}
        className={sharedClassName}
        glyph={<LinkGlyph link={link} />}
        countdownGlyph={<LinkIconRenderer value="generic:Timer" className="size-5 shrink-0" />}
        alignClass={alignClass}
        isEdge={isEdge}
        iconFirst={iconFirst}
        displayStyle={link.displayStyle}
        locale={locale}
      />
    );
  }

  // Accordion -- klik-nya toggle expand/collapse (bukan navigasi), jadi dicek DULUAN
  // sebelum displayStyle "rich"/"icon" (dua-duanya gak masuk akal buat header expand/
  // collapse) -- accordion selalu render sebagai bar biasa apapun displayStyle-nya.
  if (link.linkType === "accordion") {
    return (
      <AccordionLinkCard
        title={link.title}
        items={parseAccordionItems(link.url)}
        buttonStyle={buttonStyle}
        className={sharedClassName}
        glyph={<LinkGlyph link={link} />}
        alignClass={alignClass}
        isEdge={isEdge}
        iconFirst={iconFirst}
        locale={locale}
      />
    );
  }

  // Embed gak berupa tombol link (gak ada klik yang perlu dicatet) -> langsung nampilin
  // iframe-nya di posisi kartu pakai href asli (bukan lewat /r/). Khusus YouTube, pake
  // facade thumbnail+play (baru muat iframe YouTube asli abis diklik) -- provider lain
  // (Spotify, dll) tetep iframe langsung kayak sebelumnya (gak ada skema thumbnail publik
  // yang konsisten buat semua provider).
  if (link.linkType === "embed") {
    const youtubeId = extractYoutubeId(link.url);
    if (youtubeId) {
      return <YoutubeFacade videoId={youtubeId} title={link.title} className={sharedClassName} style={buttonStyle} />;
    }
    return (
      <div className={cn("aspect-video w-full overflow-hidden", sharedClassName)} style={buttonStyle}>
        <iframe
          src={linkHref.href}
          title={link.title}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      </div>
    );
  }

  if (link.displayStyle === "rich") {
    return (
      <a
        href={clickHref}
        target="_blank"
        rel="noopener noreferrer"
        download={linkHref.isDownload || undefined}
        className={cn("flex w-full flex-col overflow-hidden", sharedClassName)}
        style={buttonStyle}
      >
        {link.thumbnailPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- gambar sudah diproses jadi webp sendiri, bukan kandidat next/image
          <img src={`/uploads/${link.thumbnailPath}`} alt="" className="aspect-video w-full object-cover" />
        ) : null}
        <div className={cn("flex flex-col gap-1 p-4", alignClass)}>
          <span className="font-medium">{link.title}</span>
          {link.description ? <span className="whitespace-pre-line text-sm opacity-70">{link.description}</span> : null}
        </div>
      </a>
    );
  }

  // "icon" -- tombol bulat kecil cuma icon doang, gak ada judul. Dipakai buat baris icon
  // sosmed (lihat components/social-icon-row.tsx), bukan buat list link biasa. Shape+surface-nya
  // KHUSUS (getSocialIconShapeClass/Style) -- beda dari getCardStyle yang dipakai link biasa,
  // biar bisa diatur independen (circle/rounded/square, transparan/isi) di tab Social Link.
  if (link.displayStyle === "icon") {
    const socialIconStyle = { ...getSocialIconStyle(theme), "--kl-index": index } as React.CSSProperties;
    const iconClassName = cn(
      "flex size-11 shrink-0 items-center justify-center outline-none transition-opacity select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-80",
      getSocialIconShapeClass(theme),
      getButtonHoverClass(theme),
      getEntranceClass(theme),
    );
    if (link.linkType === "copy") {
      return (
        <CopyLinkButton
          linkId={link.id}
          value={link.url}
          className={iconClassName}
          style={socialIconStyle}
          locale={locale}
          copiedIcon={<CopiedCheckIcon className="size-5 shrink-0" />}
        >
          <LinkGlyph link={link} className="size-5 shrink-0" />
        </CopyLinkButton>
      );
    }
    return (
      <a
        href={clickHref}
        target="_blank"
        rel="noopener noreferrer"
        download={linkHref.isDownload || undefined}
        title={link.title}
        className={iconClassName}
        style={socialIconStyle}
      >
        <LinkGlyph link={link} className="size-5 shrink-0" />
      </a>
    );
  }

  const labelSpan = (
    <span className={isEdge ? cn("flex-1", alignClass.includes("text-left") ? "text-left" : "text-center") : undefined}>
      {link.title}
    </span>
  );
  const barClassName = cn(
    // py-4 (bukan py-3.5) -- ini hardcoded di sini, BUKAN token per-theme, jadi otomatis
    // kepake di SEMUA preset sekaligus tanpa perlu diulang-ulang di lib/theme.ts.
    "flex w-full items-center gap-2 px-5 py-4 font-medium",
    isEdge ? "justify-between" : alignClass,
    sharedClassName,
  );

  // "copy" ditulis "Judul: nilai" -- nilainya dibungkus chip dashed-border + icon Copy
  // kecil biar keliatan jelas "ini bisa diklik buat nyalin", bukan link biasa yang navigasi.
  if (link.linkType === "copy") {
    const copyChipClassName = cn(
      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs align-middle",
    );
    const copyChipStyle = { backgroundColor: "rgba(0,0,0,0.22)" };
    const copyLabelSpan = (
      <span className={cn("truncate", isEdge ? cn("flex-1", alignClass.includes("text-left") ? "text-left" : "text-center") : undefined)}>
        {link.title}
        <span className="opacity-60">:</span>{" "}
        <span className={copyChipClassName} style={copyChipStyle}>
          {link.url}
          <LinkIconRenderer value="generic:Copy" className="size-3 shrink-0 opacity-70" />
        </span>
      </span>
    );
    return (
      <CopyLinkButton
        linkId={link.id}
        value={link.url}
        className={barClassName}
        style={buttonStyle}
        locale={locale}
        copiedIcon={
          <>
            {iconFirst ? <CopiedCheckIcon className="size-4 shrink-0" /> : null}
            {copyLabelSpan}
            {!iconFirst ? <CopiedCheckIcon className="size-4 shrink-0" /> : null}
          </>
        }
      >
        {iconFirst ? <LinkGlyph link={link} /> : null}
        {copyLabelSpan}
        {!iconFirst ? <LinkGlyph link={link} /> : null}
      </CopyLinkButton>
    );
  }

  return (
    <a
      href={clickHref}
      target="_blank"
      rel="noopener noreferrer"
      download={linkHref.isDownload || undefined}
      className={barClassName}
      style={buttonStyle}
    >
      {iconFirst ? <LinkGlyph link={link} /> : null}
      {labelSpan}
      {!iconFirst ? <LinkGlyph link={link} /> : null}
    </a>
  );
}
