"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { renameDisplayNameAction } from "@/app/dashboard/settings-actions";
import type { Dictionary } from "@/lib/i18n";

// Nama yang tampil di sidebar itu SENGAJA cuma displayName (kosmetik) -- username asli
// (dipakai buat login) di-mask default & baru kebuka kalau nama-nya diklik. Biar kalau
// dashboard gak sengaja kelihatan orang lain (screen-share, lewat di belakang, dll),
// username-nya gak langsung nongol.
export function SidebarAccount({
  displayName,
  username,
  t,
}: {
  displayName: string | null;
  username: string;
  t: Dictionary;
}) {
  const router = useRouter();
  const [showUsername, setShowUsername] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName ?? "");
  const [pending, setPending] = useState(false);

  const shownName = displayName || username;

  async function handleSave() {
    setPending(true);
    await renameDisplayNameAction(value);
    setPending(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          maxLength={50}
          className="min-w-0 flex-1 rounded-md border border-sidebar-border bg-sidebar px-2 py-1 text-sm text-sidebar-primary-foreground outline-none focus:ring-1 focus:ring-sidebar-ring"
        />
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="text-sidebar-foreground hover:text-sidebar-primary-foreground"
        >
          <Check className="size-4" />
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-sidebar-foreground hover:text-sidebar-primary-foreground">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mr-3 flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
        {(shownName[0] ?? "?").toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setShowUsername((v) => !v)}
          title={t.dashboard.revealUsernameHint}
          className="block w-full truncate text-left text-sm font-medium text-sidebar-primary-foreground"
        >
          {shownName}
        </button>
        <div className="flex items-center gap-1">
          <p className="truncate text-xs text-sidebar-foreground">{showUsername ? username : "••••••"}</p>
          <button
            type="button"
            onClick={() => {
              setValue(displayName ?? "");
              setEditing(true);
            }}
            title={t.dashboard.renameLabel}
            className="shrink-0 text-sidebar-foreground/70 hover:text-sidebar-primary-foreground"
          >
            <Pencil className="size-3" />
          </button>
        </div>
      </div>
    </>
  );
}
