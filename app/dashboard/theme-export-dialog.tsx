"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { Dictionary } from "@/lib/i18n";
import type { ThemeTokens } from "@/lib/theme";
import { exportThemeBundleAction } from "./theme-bundle-actions";

export type ExportRow = { id: number; label: string; path: string; usedInTheme: boolean };

export function downloadJson(json: string, name: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(name || "theme").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ThemeExportDialog({
  rows,
  tokens,
  themeName,
  t,
  onClose,
}: {
  rows: ExportRow[];
  tokens: ThemeTokens;
  themeName: string;
  t: Dictionary;
  onClose: () => void;
}) {
  // Default: nyala cuma buat yang dipakai di theme ini, sisanya mati (gambar pribadi
  // yang gak nyambung ke theme gak ikut kekirim tanpa sengaja).
  const [selected, setSelected] = useState<Set<number>>(() => new Set(rows.filter((r) => r.usedInTheme).map((r) => r.id)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleDownload() {
    setPending(true);
    setError(null);
    const result = await exportThemeBundleAction(tokens, [...selected]);
    setPending(false);
    if ("error" in result) return setError(result.error || t.theme.exportFailed);
    downloadJson(result.json, themeName);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.theme.exportDialogTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t.theme.exportDialogDesc}</p>
        <div className="flex max-h-72 min-w-0 flex-col gap-2 overflow-y-auto overflow-x-hidden">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border p-2">
              <div className="flex min-w-0 items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- gambar sudah webp */}
                <img src={`/uploads/${row.path}`} alt="" className="h-10 w-16 shrink-0 rounded object-contain" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.label}</p>
                  {row.usedInTheme ? <p className="text-[11px] font-medium text-primary">{t.theme.exportUsedBadge}</p> : null}
                </div>
              </div>
              <Switch checked={selected.has(row.id)} onCheckedChange={(on) => toggle(row.id, on)} />
            </div>
          ))}
        </div>
        {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button type="button" onClick={handleDownload} disabled={pending}>{t.theme.exportDownload}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
