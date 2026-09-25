"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { COLOR_PALETTES } from "@/lib/color-palettes";
import { cn } from "@/lib/utils";

// Gak ada komponen Popover di components/ui/ -- toggle manual + backdrop transparan
// buat "klik luar biar nutup" (pola sama kayak dropdown lain yang udah ada di app ini,
// mis. IconPicker, cuma itu inline bukan popover). Sengaja gak pakai Dialog (modal) --
// field warna ini muncul berkali-kali di satu layar (tab Colors), modal penuh kerasa
// berat kalau buat pilihan sekecil ini.
export function ColorPalettePicker({ onPick, label }: { onPick: (hex: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(COLOR_PALETTES[0].id);
  const active = COLOR_PALETTES.find((c) => c.id === categoryId) ?? COLOR_PALETTES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={label}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Palette className="size-4" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-64 rounded-xl border bg-popover p-2.5 shadow-lg">
            <div className="mb-2 flex flex-wrap gap-1">
              {COLOR_PALETTES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    categoryId === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {active.swatches.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  title={sw.name}
                  onClick={() => {
                    onPick(sw.hex);
                    setOpen(false);
                  }}
                  className="size-6 rounded-md border border-black/10 transition-transform hover:scale-110"
                  style={{ backgroundColor: sw.hex }}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
