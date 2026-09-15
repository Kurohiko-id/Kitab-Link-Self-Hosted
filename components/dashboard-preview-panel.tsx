import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { PhoneFrame } from "@/components/phone-frame";
import { PublicPagePreview } from "@/components/public-page-preview";
import { CopyUrlButton } from "@/components/copy-url-button";
import { OpenLiveButton } from "@/components/open-live-button";
import type { ThemeTokens } from "@/lib/theme";
import type { ProfileData } from "@/lib/profile";
import type { PublicBoardData } from "@/lib/db/board";
import type { Dictionary } from "@/lib/i18n";

// Rail flush ke tepi viewport (nempel top bar di atas, mentok bawah), position:fixed --
// BUKAN "sticky di flex row" kayak versi lama (itu masih butuh parent row tinggi-tetap +
// overflow-y-auto di kolom kiri, ribet). Fixed lebih simpel: independen dari scroll flow,
// tinggal sisain ruang di flex row lewat spacer kosong di bawah biar konten kiri gak
// ketiban. Dipakai bareng tab Links & Groups, Profile, dan Theme -- biar bentuknya konsisten.
// showFrom beda per tab: Theme butuh breakpoint lebih lebar (xl) karena kolom kirinya lebih
// padat (gallery preset + tab kustomisasi), Links/Profile cukup lg.
// 510px = 340px x 1.5 (diperlebar atas permintaan user, sebelumnya kerasa kekecilan).
const BREAKPOINT_CLASSES = {
  lg: {
    spacer: "hidden lg:block lg:w-[510px] lg:shrink-0",
    panel: "fixed top-16 right-0 bottom-0 z-10 hidden w-[510px] flex-col overflow-y-auto bg-sidebar px-6 py-6 lg:flex",
  },
  xl: {
    spacer: "hidden xl:block xl:w-[510px] xl:shrink-0",
    panel: "fixed top-16 right-0 bottom-0 z-10 hidden w-[510px] flex-col overflow-y-auto bg-sidebar px-6 py-6 xl:flex",
  },
} as const;

export function DashboardPreviewPanel({
  tokens,
  profile,
  fallbackName,
  previewBoard,
  t,
  showFrom = "lg",
  previewingLabel,
  // Theme tab tetep pake mockup HP (biar kerasa "preview" pas lagi ngoprek warna/bentuk
  // tombol) -- Links & Groups + Profile matiin ini, user minta preview-nya langsung penuh
  // isi rail, gak usah dibungkus bezel HP.
  usePhoneFrame = true,
}: {
  tokens: ThemeTokens;
  profile: ProfileData;
  fallbackName: string;
  previewBoard: PublicBoardData;
  t: Dictionary;
  showFrom?: "lg" | "xl";
  previewingLabel?: ReactNode;
  usePhoneFrame?: boolean;
}) {
  const path = `/${fallbackName}`;
  const cls = BREAKPOINT_CLASSES[showFrom];
  return (
    <>
      <div className={cls.spacer} aria-hidden="true" />
      <div className={cls.panel}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-bold text-sidebar-primary-foreground">{t.overview.linkPreview}</h2>
          <Badge variant="sage" className="gap-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            {t.overview.live}
          </Badge>
        </div>
        {previewingLabel ? <p className="mb-2 text-xs font-medium text-sidebar-foreground">{previewingLabel}</p> : null}

        {usePhoneFrame ? (
          <div className="flex flex-1 items-center justify-center py-4">
            <PhoneFrame>
              <PublicPagePreview tokens={tokens} profile={profile} fallbackName={fallbackName} previewBoard={previewBoard} className="min-h-full" />
            </PhoneFrame>
          </div>
        ) : (
          <div className="my-3 flex-1 overflow-hidden rounded-xl border border-sidebar-border">
            <PublicPagePreview tokens={tokens} profile={profile} fallbackName={fallbackName} previewBoard={previewBoard} className="h-full" />
          </div>
        )}

        <div className="flex items-center justify-between gap-1 rounded-lg border border-sidebar-border bg-white/5 p-2.5">
          <span className="ml-1 truncate text-xs font-medium text-sidebar-foreground">{path}</span>
          <div className="flex shrink-0 items-center gap-0.5">
            <CopyUrlButton path={path} className="rounded-md p-1.5 text-sidebar-foreground transition-colors hover:bg-white/10 hover:text-sidebar-primary-foreground" />
            <OpenLiveButton
              path={path}
              title={t.overview.openLivePage}
              className="rounded-md p-1.5 text-sidebar-foreground transition-colors hover:bg-white/10 hover:text-sidebar-primary-foreground"
            />
          </div>
        </div>
      </div>
    </>
  );
}
