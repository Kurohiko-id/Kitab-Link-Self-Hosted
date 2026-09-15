import Link from "next/link";
import { LinkIconRenderer } from "@/components/link-icon";
import type { LinkRankRow } from "@/lib/db/analytics";

// Ranking klik lintas SEMUA page milik user, udah diurutin desc dari server
// (getCrossPageAnalytics). Tiap baris nunjukin link itu ada di page mana.
export function OverviewLinksTable({ rows }: { rows: LinkRankRow[] }) {
  return (
    <div className="space-y-2 p-4">
      {rows.map((row, index) => (
        <Link
          key={row.linkId}
          href={`/dashboard?page=${row.pageId}&tab=links`}
          className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-4 shrink-0 text-xs font-medium text-muted-foreground">{index + 1}</span>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              {row.icon ? <LinkIconRenderer value={row.icon} className="size-4" /> : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.title}</p>
              <p className="truncate text-xs text-muted-foreground">/{row.pageSlug}</p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">{row.clicks} clicks</span>
        </Link>
      ))}
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">—</p> : null}
    </div>
  );
}
