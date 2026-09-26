"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { deleteDiscordWidgetAction, toggleDiscordWidgetEnabledAction } from "@/app/dashboard/discord-widget-actions";
import { DiscordWidgetFormModal, type DiscordWidgetModalState } from "@/components/discord-widget-form-modal";
import type { DiscordWidgetRow } from "@/lib/db/discord-widget";
import type { Dictionary } from "@/lib/i18n";
import type { ThemeTokens } from "@/lib/theme";

const FLOATING_POSITION_LABEL_KEY: Record<string, keyof Dictionary["widgets"]> = {
  "left-top": "positionLeftTop",
  "left-middle": "positionLeftMiddle",
  "left-bottom": "positionLeftBottom",
  "right-top": "positionRightTop",
  "right-middle": "positionRightMiddle",
  "right-bottom": "positionRightBottom",
};

// List widget + tombol "+ Tambah" yang buka DiscordWidgetFormModal -- pola sama persis
// kayak Board (link-form-modal.tsx): list-nya sendiri gak punya form apa-apa, cuma baris
// ringkas + Edit/Delete, form-nya di popup terpisah.
export function DiscordWidgetsManager({
  pageId,
  discordWidgets,
  theme,
  t,
}: {
  pageId: number;
  discordWidgets: DiscordWidgetRow[];
  theme: ThemeTokens;
  t: Dictionary;
}) {
  const router = useRouter();
  const [modalState, setModalState] = useState<DiscordWidgetModalState | null>(null);

  async function handleDelete(widgetId: number) {
    await deleteDiscordWidgetAction(pageId, widgetId);
    router.refresh();
  }

  async function handleToggleEnabled(widgetId: number, isEnabled: boolean) {
    await toggleDiscordWidgetEnabledAction(pageId, widgetId, isEnabled);
    router.refresh();
  }

  return (
    <div className="flex max-w-md flex-col gap-2">
      {discordWidgets.map((widget) => (
        <div key={widget.id} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm">
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <span className="truncate">{widget.name}</span>
            <Badge variant="sky">
              {widget.placementMode === "floating"
                ? t.widgets[FLOATING_POSITION_LABEL_KEY[widget.floatingPosition ?? ""] ?? "placementFloating"]
                : t.widgets.placementInline}
            </Badge>
            {!widget.isEnabled ? <Badge variant="neutral">{t.widgets.discordDisabledBadge}</Badge> : null}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <Switch checked={widget.isEnabled} onCheckedChange={(checked) => handleToggleEnabled(widget.id, checked)} />
            <button
              type="button"
              onClick={() => setModalState({ mode: "edit", widget })}
              className="rounded p-1.5 text-muted-foreground hover:text-foreground"
              title={t.common.edit}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(widget.id)}
              className="rounded p-1.5 text-destructive hover:bg-destructive/10"
              title={t.common.delete}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={() => setModalState({ mode: "create" })}>
        <Plus className="size-3.5" />
        {t.widgets.discordAddNew}
      </Button>

      {/* key ngikut widget yang lagi diedit -- tanpa ini instance modal-nya kepake ulang
          (gak remount) tiap ganti target, jadi useState internal (guildId dkk) nyangkut
          nilai dari widget SEBELUMNYA alih-alih ke-reset ke punya widget yang baru dibuka. */}
      <DiscordWidgetFormModal
        key={modalState ? (modalState.mode === "edit" ? `edit-${modalState.widget.id}` : "create") : "closed"}
        pageId={pageId}
        state={modalState}
        theme={theme}
        t={t}
        onClose={() => setModalState(null)}
      />
    </div>
  );
}
