"use client";

import { useState } from "react";
import { LinkCard } from "@/components/link-card";
import { cn } from "@/lib/utils";
import { getCustomFontFaceCSS, getPageBackgroundStyle, getTypographyStyle, type ThemeTokens } from "@/lib/theme";
import { isGroupOn, LINK_STYLE_GROUP_ORDER, resolveLinkTheme, type LinkStyleOverride } from "@/lib/link-style";
import type { DisplayStyle, PublicLink } from "@/lib/db/board";
import type { Dictionary, Locale } from "@/lib/i18n";

// Cuma bagian modal yang kelihatan di tombol -- sisanya (url, utm, dst) gak relevan di panggung.
export type StageLink = {
  title: string;
  displayStyle: DisplayStyle;
  icon: string | null;
  featured: boolean;
  thumbnailPath: string | null;
  // Gambar kecil card style Image (icon/emoji menang atas ini, sama kayak halaman publik).
  imageContentPath: string | null;
  imageHideBorder: boolean;
  imageHideBackground: boolean;
  imageShowTitle: boolean;
  imageShowContent: boolean;
};

// Panggung kecil buat satu tombol: LinkCard YANG SAMA dengan halaman publik, di atas latar
// halaman dari theme (surface glass/blur/transparent butuh latar asli biar kelihatan benar).
// Nempel (sticky) di atas area scroll modal, jadi tetap kelihatan pas kontrol di bawahnya digeser.
export function LinkStyleStage({
  theme,
  override,
  link,
  t,
  locale,
}: {
  theme: ThemeTokens;
  override: LinkStyleOverride | null;
  link: StageLink;
  t: Dictionary;
  locale: Locale;
}) {
  const [view, setView] = useState<"custom" | "theme">("custom");
  const activeOverride = view === "custom" ? override : null;
  const groupsOn = LINK_STYLE_GROUP_ORDER.filter((group) => isGroupOn(override, group)).length;
  const effective = resolveLinkTheme(theme, activeOverride);
  const fontFace = getCustomFontFaceCSS(theme);

  const stageLink: PublicLink = {
    id: -1,
    title: link.title.trim() || "New link",
    url: "https://example.com",
    description: null,
    thumbnailPath: link.thumbnailPath,
    imageHideBorder: link.imageHideBorder,
    imageHideBackground: link.imageHideBackground,
    imageShowTitle: link.imageShowTitle,
    imageShowContent: link.imageShowContent,
    imageContentPath: link.imageContentPath,
    imageRadius: null,
    imageShadow: "theme",
    displayStyle: link.displayStyle,
    icon: link.icon,
    linkType: "url",
    featured: link.featured,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    iconPosition: "top",
    styleOverride: activeOverride,
  };

  const note =
    view === "theme" ? t.linkModal.styleStageThemeOnly : groupsOn === 0 ? t.linkModal.styleStageNone : t.linkModal.styleStageHover;

  return (
    <div className="sticky top-0 z-10 overflow-hidden rounded-xl border bg-popover shadow-md">
      {fontFace ? <style dangerouslySetInnerHTML={{ __html: fontFace }} /> : null}
      <div
        className="relative px-5 pt-8 pb-5"
        style={{ ...getPageBackgroundStyle(theme), ...getTypographyStyle(theme) }}
        // Tombol di panggung cuma contoh: klik gak boleh buka /r/-1 di tab baru.
        onClickCapture={(e) => e.preventDefault()}
      >
        <span className="pointer-events-none absolute top-2 left-3 text-[11px] text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
          {t.linkModal.styleStageTag}
        </span>
        {/* key: ganti tampilan / entrance -> kartu di-mount ulang, jadi animasi masuknya kelihatan lagi. */}
        <LinkCard key={`${view}-${effective.pageEntrance}`} link={stageLink} theme={theme} index={0} locale={locale} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-popover/90 px-3 py-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group">
          {(["custom", "theme"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "custom" ? t.linkModal.styleViewCustom : t.linkModal.styleViewTheme}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{note}</span>
      </div>
    </div>
  );
}
