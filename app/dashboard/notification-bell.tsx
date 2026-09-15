"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Download, Sparkles, Unlink2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LatestRelease } from "@/lib/update-check";
import type { DeadLink } from "@/lib/db/dead-links";
import type { Dictionary } from "@/lib/i18n";
import { dismissUpdateAction } from "./update-actions";

// Dropdown-nya generik ("Notifications" bukan "Update tersedia") biar gampang nambah
// jenis notif lain nanti -- sekarang ada 2: update rilis baru (GitHub) + link mati
// (lihat lib/dead-links.ts).
export function NotificationBell({
  release,
  deadLinks,
  t,
}: {
  release: LatestRelease | null;
  deadLinks: DeadLink[];
  t: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hasUpdate = release !== null && !dismissed;
  const hasDeadLinks = deadLinks.length > 0;
  const hasAny = hasUpdate || hasDeadLinks;

  async function handleDismiss() {
    if (!release) return;
    setDismissed(true);
    setOpen(false);
    await dismissUpdateAction(release.version);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative text-muted-foreground hover:text-foreground"
      >
        <Bell className="size-5" />
        {hasAny ? (
          <span className="absolute top-0 right-0 block size-2 rounded-full bg-destructive ring-2 ring-card" />
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-3 w-80 rounded-xl border bg-card p-4 shadow-lg">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
              <Bell className="size-4 text-primary" /> {t.notifications.title}
            </h3>
            <div className="flex flex-col gap-3">
              {hasUpdate && release ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {t.notifications.updateAvailable} {release.version}
                      </p>
                      <a
                        href={release.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block truncate text-xs text-primary hover:underline"
                      >
                        {t.notifications.viewChangelog}
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{t.notifications.howToUpdate}</p>
                    <code className="block rounded-lg bg-muted p-2.5 text-xs break-all">
                      docker compose pull && docker compose up -d
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium",
                      "hover:bg-muted",
                    )}
                  >
                    <Download className="size-3.5" /> {t.notifications.gotIt}
                  </button>
                </div>
              ) : null}

              {hasDeadLinks ? (
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <Unlink2 className="size-3.5" />
                    {t.notifications.deadLinksTitle} ({deadLinks.length})
                  </p>
                  <ul className="flex flex-col gap-1">
                    {deadLinks.map((link) => (
                      <li key={link.id}>
                        <Link
                          href={`/dashboard?page=${link.pageId}&tab=links&openLink=${link.id}`}
                          onClick={() => setOpen(false)}
                          className="block truncate rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs hover:bg-destructive/10"
                        >
                          {link.title} <span className="text-muted-foreground">/{link.pageSlug}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!hasAny ? <p className="text-xs text-muted-foreground">{t.notifications.upToDate}</p> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
