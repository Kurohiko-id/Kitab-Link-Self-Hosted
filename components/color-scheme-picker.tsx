"use client";

import { useState } from "react";
import { COLOR_SCHEME_CATEGORIES, COLOR_SCHEMES, type ColorScheme, type ColorSchemeCategoryId } from "@/lib/color-palettes";
import { cn } from "@/lib/utils";

// Beda dari ColorPalettePicker (itu ngisi SATU field doang, dipicu per-field) -- ini
// nempel di ATAS grid ColorField sekaligus, ngisi text/textMuted/background/cardBackground/
// cardBorder/buttonText BARENGAN dalam satu klik, biar pemula gak perlu mikirin kombinasi
// sendiri satu-satu. Selalu tampil (bukan popover) sesuai posisi yang diminta.
export function ColorSchemePicker({ onPick }: { onPick: (scheme: ColorScheme) => void }) {
  const [categoryId, setCategoryId] = useState<ColorSchemeCategoryId>(COLOR_SCHEME_CATEGORIES[0].id);
  const schemes = COLOR_SCHEMES.filter((s) => s.category === categoryId);

  return (
    <div className="rounded-xl border bg-muted/50 p-3">
      <div className="mb-2.5 flex flex-wrap gap-1">
        {COLOR_SCHEME_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryId(cat.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              categoryId === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {schemes.map((scheme) => (
          <button
            key={scheme.id}
            type="button"
            onClick={() => onPick(scheme)}
            title={scheme.name}
            className="group flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors hover:bg-background"
          >
            <span
              className="flex size-11 items-center justify-center rounded-lg border"
              style={{ backgroundColor: scheme.background, borderColor: scheme.cardBorder }}
            >
              <span className="size-5 rounded-md border" style={{ backgroundColor: scheme.cardBackground, borderColor: scheme.cardBorder }} />
            </span>
            <span className="max-w-full truncate text-[10px] text-muted-foreground group-hover:text-foreground">{scheme.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
