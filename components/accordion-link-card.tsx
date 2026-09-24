"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccordionItem } from "@/lib/link-render";
import { CopiedCheckIcon, CopyLinkButton } from "@/components/copy-link-button";
import { LinkIconRenderer } from "@/components/link-icon";
import type { PublicLocale } from "@/lib/public-i18n";

// Item di dalam list yang di-expand: default "url" (sub-link beneran, klik buka di tab
// baru, mirip link card biasa cuma "disembunyiin" di balik satu header expand/collapse),
// atau "copy" (klik = copy `url` ke clipboard, sama semantiknya kayak linkType "copy" di
// level parent). Item BUKAN row di tabel `links` sendiri (cuma bagian dari JSON di
// parent-nya) -- jadi klik-nya gak lewat /r/[linkId], gak ke-catet di analytics per-item.
function AccordionItemRow({ item, locale }: { item: AccordionItem; locale?: PublicLocale }) {
  const rowClassName = "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-black/10";

  if (item.type === "copy") {
    return (
      <CopyLinkButton
        value={item.url}
        className={rowClassName}
        locale={locale}
        copiedIcon={
          <>
            <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
            <CopiedCheckIcon className="size-3.5 shrink-0" />
          </>
        }
      >
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <LinkIconRenderer value="generic:Copy" className="size-3.5 shrink-0 opacity-60" />
      </CopyLinkButton>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={rowClassName}
    >
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <ArrowUpRight className="size-3.5 shrink-0 opacity-60" />
    </a>
  );
}

// Header-nya tetep 1 tombol (link biasa), tapi klik-nya toggle expand/collapse list di
// bawahnya (bukan navigasi) -- makanya harus client component, beda dari LinkCard yang
// sebisa mungkin server-rendered (prinsip "minim client JS" di project ini, JS-nya
// diisolasi cuma di sini, bukan ikut nge-bundle seluruh LinkCard).
export function AccordionLinkCard({
  title,
  items,
  buttonStyle,
  className,
  glyph,
  alignClass,
  isEdge,
  iconFirst,
  locale,
}: {
  title: string;
  items: AccordionItem[];
  buttonStyle: React.CSSProperties;
  className?: string;
  glyph: ReactNode;
  // Tiga ini dihitung sekali di link-card.tsx (dari theme.linkIconPosition/buttonAlign) dan
  // dipakai APA ADANYA di sini juga -- biar header accordion beneran ngikut alignment/posisi
  // icon theme kayak tombol link biasa, bukan hardcode justify-between + icon selalu di kiri.
  alignClass: string;
  isEdge: boolean;
  iconFirst: boolean;
  locale?: PublicLocale;
}) {
  const [open, setOpen] = useState(false);

  const labelSpan = (
    <span className={isEdge ? cn("flex-1", alignClass.includes("text-left") ? "text-left" : "text-center") : undefined}>
      {title}
    </span>
  );

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        // py-4 -- samain sama barClassName di link-card.tsx (dulu py-3.5 di kedua tempat,
        // kelewat kalau cuma diubah di satu file, headernya jadi lebih pendek dari tombol
        // biasa). relative TETEP perlu di sini (bukan buat chevron) -- kl-hover-shine
        // (lihat globals.css) butuh ancestor positioned buat ::after-nya.
        //
        // Chevron SELALU jadi child flex PALING TERAKHIR (bukan absolute) -- di mode edge,
        // dia otomatis nempel di ujung kanan tombol (label yang flex-1 udah nyerap sisa
        // ruang, chevron+glyph edge-right cuma numpuk gap-2 di ujung, gak overlap). Di mode
        // non-edge, dia ikut ngumpul bareng icon+judul yang di-center/kiri-in alignClass --
        // sengaja BUKAN dipisah ke pojok sendiri, biar gak numpuk sama glyph edge-nya lagi.
        className={cn(
          "relative flex w-full items-center gap-2 px-5 py-4 font-medium",
          isEdge ? "justify-between" : alignClass,
          className,
        )}
        style={buttonStyle}
      >
        {iconFirst ? glyph : null}
        {labelSpan}
        {!iconFirst ? glyph : null}
        <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && items.length > 0 ? (
        <div
          className="mt-1.5 flex flex-col gap-0.5 rounded-xl border p-1.5"
          style={{ backgroundColor: buttonStyle.backgroundColor, borderColor: buttonStyle.borderColor, color: buttonStyle.color }}
        >
          {items.map((item, i) => (
            <AccordionItemRow key={i} item={item} locale={locale} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
