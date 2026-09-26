"use client";

import { cn } from "@/lib/utils";

const POSITIONS: { value: string; style: React.CSSProperties }[] = [
  { value: "left-top", style: { top: 10, left: 10 } },
  { value: "left-middle", style: { top: "50%", left: 10, transform: "translateY(-50%)" } },
  { value: "left-bottom", style: { bottom: 10, left: 10 } },
  { value: "right-top", style: { top: 10, right: 10 } },
  { value: "right-middle", style: { top: "50%", right: 10, transform: "translateY(-50%)" } },
  { value: "right-bottom", style: { bottom: 10, right: 10 } },
];

// Mockup layar (kotak bulat) + 6 titik yang bisa diklik langsung di posisinya masing-masing --
// pengganti dropdown teks, biar user LANGSUNG kebayang widget-nya bakal nempel di mana,
// bukan mikirin sendiri arti "kiri tengah" dsb.
export function DiscordPositionPicker({
  value,
  onChange,
  labelFor,
  mainContentLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  labelFor: (value: string) => string;
  mainContentLabel: string;
}) {
  return (
    <div className="relative h-28 w-full rounded-xl border-2 border-dashed bg-muted/30">
      {/* Kotak tengah niru kolom konten halaman (sempit di tengah, kayak Linktree) --
          biar posisi titik-titik di kiri/kanannya kebaca sebagai floating widget nempel di
          pinggir viewport BROWSER, bukan di pinggir konten yang emang udah sempit sendiri. */}
      <div className="pointer-events-none absolute inset-y-3 left-1/2 flex w-14 -translate-x-1/2 items-center justify-center rounded-md border bg-card px-1 text-center text-[8px] leading-tight font-medium text-muted-foreground">
        {mainContentLabel}
      </div>
      {POSITIONS.map((pos) => (
        <button
          key={pos.value}
          type="button"
          onClick={() => onChange(pos.value)}
          title={labelFor(pos.value)}
          className={cn(
            "absolute size-4 rounded-full border-2 transition-all",
            value === pos.value
              ? "scale-125 border-primary bg-primary"
              : "border-muted-foreground/40 bg-background hover:border-muted-foreground",
          )}
          style={pos.style}
        />
      ))}
    </div>
  );
}
