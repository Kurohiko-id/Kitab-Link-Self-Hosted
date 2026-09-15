"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n";

export type GroupModalState = { mode: "create" } | { mode: "rename"; groupId: number; currentName: string };

export function GroupFormModal({
  state,
  t,
  onClose,
  onSubmit,
}: {
  state: GroupModalState | null;
  t: Dictionary;
  onClose: () => void;
  onSubmit: (name: string, groupId: number | null) => void;
}) {
  const [name, setName] = useState(state?.mode === "rename" ? state.currentName : "");

  if (!state) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, state?.mode === "rename" ? state.groupId : null);
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
          <DialogTitle>{state.mode === "rename" ? t.board.renameGroup : t.board.addGroup}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-name">{t.board.groupNameLabel}</Label>
            <Input
              id="group-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.board.newGroupPlaceholder}
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
