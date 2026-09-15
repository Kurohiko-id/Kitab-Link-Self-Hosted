"use client";

import { useState } from "react";
import { Info, Heart, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LinkIconRenderer } from "@/components/link-icon";
import type { LatestRelease } from "@/lib/update-check";
import type { Dictionary } from "@/lib/i18n";

const GITHUB_URL = "https://github.com/Kurohiko-id/Kitab-Link-Self-Hosted";
const SAWERIA_URL = "https://saweria.co/Kurohiko";

// Dipasang di footer sidebar (deket avatar/logout) -- About itu info level APLIKASI
// (versi, owner, donate), bukan setting per-page, jadi sengaja gak masuk tab Settings
// yang lain (itu semua scoped ke activePage). Modal biasa, gak butuh routing/tab baru.
export function AboutDialog({
  version,
  availableUpdate,
  t,
}: {
  version: string;
  availableUpdate: LatestRelease | null;
  t: Dictionary;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t.about.title}
        className="text-sidebar-foreground hover:text-sidebar-primary-foreground"
      >
        <Info className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex flex-col items-center gap-2 pt-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo statis kecil, bukan kandidat next/image */}
              <img src="/logo.png" alt="" className="size-14 rounded-2xl shadow-sm" />
              <DialogTitle>Kitab Link</DialogTitle>
              <DialogDescription>{t.about.tagline}</DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <span className="text-muted-foreground">{t.about.version}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">v{version}</span>
                {availableUpdate ? (
                  <Badge variant="amber">{t.about.updateAvailable}</Badge>
                ) : (
                  <Badge variant="sage">{t.about.upToDate}</Badge>
                )}
              </div>
            </div>

            {availableUpdate ? (
              <a
                href={availableUpdate.url}
                target="_blank"
                rel="noopener noreferrer"
                className="-mt-1 text-xs text-primary hover:underline"
              >
                v{availableUpdate.version} -- {t.about.viewChangelog}
              </a>
            ) : null}

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                <LinkIconRenderer value="brand:github" className="size-4" /> {t.about.sourceCode}
              </span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </a>

            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{t.about.owner}</p>
              <p className="font-medium">Kurohiko</p>
            </div>

            <a
              href={SAWERIA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Heart className="size-4" /> {t.about.donate}
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
