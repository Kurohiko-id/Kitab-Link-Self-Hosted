"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n";

export function PageFormModal({
  open,
  t,
  onClose,
  onSubmit,
}: {
  open: boolean;
  t: Dictionary;
  onClose: () => void;
  onSubmit: (name: string, displayName: string) => void;
}) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, displayName.trim());
    setName("");
    setDisplayName("");
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.pageSwitcher.newPageTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-page-name">{t.pageSwitcher.newPageNameLabel}</Label>
            <Input
              id="new-page-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.pageSwitcher.newPageNamePlaceholder}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-page-display-name">{t.pageSwitcher.newPageDisplayNameLabel}</Label>
            <Input
              id="new-page-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t.pageSwitcher.newPageDisplayNamePlaceholder}
            />
          </div>

          <Button type="submit" disabled={!name.trim()}>
            {t.common.save}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
