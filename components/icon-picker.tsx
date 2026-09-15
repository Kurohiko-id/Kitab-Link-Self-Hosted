"use client";

import { useMemo, useState } from "react";
import { Search, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LinkIconRenderer, ALL_ICON_OPTIONS, BRAND_ICON_OPTIONS, ICON_PICKER_CATEGORIES } from "@/components/link-icon";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

const BASE_ICON_TABS = ["All", ...Object.keys(ICON_PICKER_CATEGORIES), "Brand"];

// Diekstrak jadi komponen sendiri (dipisah dari tab "Emoji" internal IconPicker di bawah)
// biar bisa dipakai juga sebagai tab TOP-LEVEL tersendiri (link-form-modal.tsx, sejajar
// sama Thumbnail/Icon/Auto) -- gak perlu 2 level navigasi (buka Icon dulu baru ke Emoji).
export function EmojiPicker({ value, onChange, t }: { value: string; onChange: (value: string) => void; t: Dictionary }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-background p-3">
      <p className="text-xs text-muted-foreground">{t.linkModal.emojiHint}</p>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={value.startsWith("emoji:") ? value.slice("emoji:".length) : ""}
          onChange={(e) => {
            const emoji = e.target.value.trim();
            onChange(emoji ? `emoji:${emoji}` : "");
          }}
          placeholder="🔥"
          className="h-12 w-20 rounded-lg border bg-background text-center text-2xl outline-none focus-visible:border-ring"
        />
        {value.startsWith("emoji:") ? (
          <LinkIconRenderer value={value} className="size-8" />
        ) : (
          <span className="text-xs text-muted-foreground">{t.linkModal.emojiPreviewEmpty}</span>
        )}
      </div>
    </div>
  );
}

// Dipakai di modal edit link (link-form-modal.tsx, dengan opsi "auto", showEmoji=false
// karena Emoji udah jadi tab top-level sendiri di situ) DAN di picker icon custom Social
// Links (social-links-manager.tsx, tanpa opsi "auto" -- icon sosmed wajib ada, gak ada
// konsep fallback favicon di situ -- dan showEmoji tetep true, gak ada tab luar di sana).
export function IconPicker({
  value,
  onChange,
  t,
  showAutoOption = true,
  showEmoji = true,
}: {
  value: string;
  onChange: (value: string) => void;
  t: Dictionary;
  showAutoOption?: boolean;
  showEmoji?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const tabs = showEmoji ? [...BASE_ICON_TABS, "Emoji"] : BASE_ICON_TABS;

  const options = useMemo(() => {
    const pool =
      tab === "All" ? ALL_ICON_OPTIONS : tab === "Brand" ? BRAND_ICON_OPTIONS : ICON_PICKER_CATEGORIES[tab];
    const q = query.trim().toLowerCase();
    return q ? pool.filter((opt) => opt.label.toLowerCase().includes(q)) : pool;
  }, [tab, query]);

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t.linkModal.searchIcon}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 bg-background pl-8 text-xs"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {tabs.map((tabName) => (
          <button
            key={tabName}
            type="button"
            onClick={() => setTab(tabName)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              tab === tabName
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {tabName}
          </button>
        ))}
      </div>
      {tab === "Emoji" && showEmoji ? (
        <EmojiPicker value={value} onChange={onChange} t={t} />
      ) : (
        <div className="grid max-h-36 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg bg-background p-1.5">
          {showAutoOption ? (
            <button
              type="button"
              onClick={() => onChange("")}
              title={t.linkModal.autoIcon}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-muted-foreground",
                value === ""
                  ? "bg-primary/10 text-primary ring-1 ring-primary"
                  : "hover:bg-destructive/10 hover:text-destructive",
              )}
            >
              <Ban className="size-4" />
            </button>
          ) : null}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              title={opt.label}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-muted-foreground",
                value === opt.value ? "bg-primary/10 text-primary ring-1 ring-primary" : "hover:bg-muted",
              )}
            >
              <LinkIconRenderer value={opt.value} className="size-4" />
            </button>
          ))}
          {options.length === 0 && (
            <div className="col-span-8 py-2 text-center text-xs text-muted-foreground">{t.linkModal.noIconFound}</div>
          )}
        </div>
      )}
    </div>
  );
}
