"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasUpdate = release !== null && !dismissed;
  const hasDeadLinks = deadLinks.length > 0;
  const hasAny = hasUpdate || hasDeadLinks;

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 12, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  }

  async function handleDismiss() {
    if (!release) return;
    setDismissed(true);
    setOpen(false);
    await dismissUpdateAction(release.version);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="relative text-muted-foreground hover:text-foreground"
      >
        <Bell className="size-5" />
        {hasAny ? (
          <span className="absolute top-0 right-0 block size-2 rounded-full bg-destructive ring-2 ring-card" />
        ) : null}
      </button>

      {/* Diportal ke document.body -- DashboardPreviewPanel (fixed, dipakai di tab Links/
          Profile/Theme) bikin sebagian ancestor jadi containing block buat elemen fixed
          (gara-gara animate-in di app/dashboard/page.tsx pakai transform), jadi dropdown
          absolute/fixed biasa di sini bisa ketutupan walau z-index-nya lebih tinggi. Portal
          ngilangin masalah itu total -- dropdown selalu render di root, gak kena imbas
          stacking context ancestor manapun. */}
      {open && coords
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div
                className="fixed z-50 w-80 rounded-xl border bg-card p-4 shadow-lg"
                style={{ top: coords.top, right: coords.right }}
              >
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
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
