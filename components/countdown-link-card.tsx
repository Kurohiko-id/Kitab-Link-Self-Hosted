"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CountdownData } from "@/lib/link-render";
import type { DisplayStyle } from "@/lib/db/board";
import { getPublicDictionary, type PublicLocale } from "@/lib/public-i18n";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Format digital "HH:MM:SS" (nambah "D:" di depan kalau masih > 1 hari) -- sengaja bukan
// kata "hari/jam/menit" biar gak butuh terjemahan sendiri buat pengunjung id/en.
function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return days > 0 ? `${days}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Sebelum endsAt: bar/card biasa TAPI bukan <a> (gak bisa diklik), nampilin sisa waktu
// digital -- klik-nya munculin toast ngasih tau kapan baru bisa diakses (bukan diem aja,
// biar pengunjung gak ngira link-nya rusak). Abis endsAt lewat: countdown ilang, ganti jadi
// <a> beneran -- ini alasannya harus client component (accordion-link-card.tsx pola yang
// sama), ngitung detik jalan real-time tanpa reload; server cuma tau "udah lewat atau
// belum" pas request awal.
export function CountdownLinkCard({
  title,
  description,
  thumbnailPath,
  data,
  clickHref,
  buttonStyle,
  className,
  glyph,
  countdownGlyph,
  alignClass,
  isEdge,
  iconFirst,
  displayStyle,
  locale = "en",
}: {
  title: string;
  description: string | null;
  thumbnailPath: string | null;
  data: CountdownData | null;
  clickHref: string;
  buttonStyle: React.CSSProperties;
  className?: string;
  // "Nonaktif sementara" (belum lewat endsAt) SENGAJA paksa icon countdown (`countdownGlyph`)
  // walau user udah set icon/thumbnail sendiri -- baru abis lewat, `glyph` (icon/thumbnail
  // pilihan user, fallback ke default per-type kalau gak diset) yang kepake. Rich style gak
  // pernah nampilin glyph kecil ini (dua-duanya diabaikan di mode itu), sama kayak link rich biasa.
  glyph: ReactNode;
  countdownGlyph: ReactNode;
  alignClass: string;
  isEdge: boolean;
  iconFirst: boolean;
  displayStyle: DisplayStyle;
  locale?: PublicLocale;
}) {
  const t = getPublicDictionary(locale);
  const endsAtMs = data ? new Date(data.endsAt).getTime() : 0;
  const [remaining, setRemaining] = useState(() => endsAtMs - Date.now());
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => setRemaining(endsAtMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [data, endsAtMs]);

  const isLocked = !data || remaining > 0;

  function handleLockedClick() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  }

  const toast = showToast ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg" suppressHydrationWarning>
        {t.countdownLockedToast(formatRemaining(remaining))}
      </div>
    </div>
  ) : null;

  if (displayStyle === "rich") {
    const cardClassName = cn("flex w-full flex-col overflow-hidden text-left", className);
    const body = (
      <>
        {thumbnailPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- gambar sudah diproses jadi webp sendiri, bukan kandidat next/image
          <img src={`/uploads/${thumbnailPath}`} alt="" className="aspect-video w-full object-cover" />
        ) : null}
        <div className={cn("flex flex-col gap-1 p-4", alignClass)}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{title}</span>
            {isLocked && data ? (
              <span className="shrink-0 font-mono text-xs tabular-nums opacity-70" suppressHydrationWarning>
                {formatRemaining(remaining)}
              </span>
            ) : null}
          </div>
          {description ? <span className="whitespace-pre-line text-sm opacity-70">{description}</span> : null}
        </div>
      </>
    );
    if (isLocked) {
      return (
        <>
          <button type="button" onClick={handleLockedClick} className={cardClassName} style={buttonStyle} aria-disabled="true">
            {body}
          </button>
          {toast}
        </>
      );
    }
    return (
      <a href={clickHref} target="_blank" rel="noopener noreferrer" className={cardClassName} style={buttonStyle}>
        {body}
      </a>
    );
  }

  const barClassName = cn(
    "flex w-full items-center gap-2 px-5 py-4 font-medium",
    isEdge ? "justify-between" : alignClass,
    className,
  );
  const labelSpan = (
    <span className={isEdge ? cn("flex-1", alignClass.includes("text-left") ? "text-left" : "text-center") : undefined}>
      {title}
    </span>
  );

  if (isLocked) {
    return (
      <>
        <button type="button" onClick={handleLockedClick} className={barClassName} style={buttonStyle} aria-disabled="true">
          {iconFirst ? countdownGlyph : null}
          {labelSpan}
          {data ? (
            <span className="shrink-0 font-mono text-xs tabular-nums opacity-70" suppressHydrationWarning>
              {formatRemaining(remaining)}
            </span>
          ) : null}
          {!iconFirst ? countdownGlyph : null}
        </button>
        {toast}
      </>
    );
  }

  return (
    <a href={clickHref} target="_blank" rel="noopener noreferrer" className={barClassName} style={buttonStyle}>
      {iconFirst ? glyph : null}
      {labelSpan}
      {!iconFirst ? glyph : null}
    </a>
  );
}
