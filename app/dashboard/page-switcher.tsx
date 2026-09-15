"use client";

import { useRouter } from "next/navigation";
import { PlusCircle, ChevronDown } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { createPage } from "./page-actions";

type PageOption = { id: number; slug: string };

export function PageSwitcher({
  pages,
  activePageId,
  activeTab,
  t,
}: {
  pages: PageOption[];
  activePageId: number;
  activeTab: string;
  t: Dictionary;
}) {
  const router = useRouter();

  return (
    <div className="px-2 pt-2 pb-1">
      <div className="mb-1.5 flex items-center justify-between px-3 text-[11px] font-semibold tracking-wider text-sidebar-foreground uppercase">
        <span>{t.pageSwitcher.activePage}</span>
        <button
          type="button"
          title={t.pageSwitcher.newPageTitle}
          className="text-sidebar-foreground transition-colors hover:text-sidebar-primary-foreground"
          onClick={() => {
            const name = window.prompt(t.pageSwitcher.newPagePrompt);
            if (!name) return;
            createPage(name).then((page) => {
              if (page) router.push(`/dashboard?page=${page.id}&tab=${activeTab}`);
            });
          }}
        >
          <PlusCircle className="size-3.5" />
        </button>
      </div>
      <div className="relative">
        <select
          value={activePageId}
          onChange={(e) => router.push(`/dashboard?page=${e.target.value}&tab=${activeTab}`)}
          className="w-full cursor-pointer appearance-none rounded-lg border border-sidebar-border bg-sidebar-accent px-3 py-2.5 pr-8 text-xs text-sidebar-primary-foreground outline-none focus:ring-1 focus:ring-sidebar-ring"
        >
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              /{page.slug}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-sidebar-foreground">
          <ChevronDown className="size-4" />
        </div>
      </div>
    </div>
  );
}
