"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { SearchableLink } from "@/lib/db/board";

// Data semua link (lintas page) dilempar sebagai prop dari server (bukan fetch API
// terpisah) -- skala project ini kecil (~10rb visitor/bulan, link per user dikit),
// jadi filter di client langsung lebih simpel ketimbang bikin endpoint+debounce.
export function DashboardSearch({ links, placeholder }: { links: SearchableLink[]; placeholder: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return links.filter((l) => l.title.toLowerCase().includes(q)).slice(0, 8);
  }, [query, links]);

  function goTo(link: SearchableLink) {
    setQuery("");
    setOpen(false);
    // openLink dibaca sama Board (app/dashboard/board.tsx) buat auto-scroll + buka modal edit.
    router.push(`/dashboard?page=${link.pageId}&tab=links&openLink=${link.id}`);
  }

  return (
    <div className="relative max-w-lg flex-1">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="size-4 text-muted-foreground" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // onMouseDown di hasil pencarian jalan SEBELUM blur ini, jadi klik tetep kedaftar.
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className="block w-full rounded-md border bg-muted py-2 pr-3 pl-10 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
      />
      {open && results.length > 0 ? (
        <div className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border bg-card shadow-lg">
          {results.map((link) => (
            <button
              key={link.id}
              type="button"
              onMouseDown={() => goTo(link)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="truncate">{link.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">/{link.pageSlug}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
