"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { DiscordPositionPicker } from "@/components/discord-position-picker";
import { DiscordWidgetCard } from "@/components/discord-widget-card";
import { DiscordIframe } from "@/components/discord-iframe";
import { saveDiscordWidgetAction } from "@/app/dashboard/discord-widget-actions";
import type { DiscordWidgetRow } from "@/lib/db/discord-widget";
import type { DiscordWidgetData } from "@/lib/discord-widget";
import type { ThemeTokens } from "@/lib/theme";
import type { Dictionary } from "@/lib/i18n";
import { getPublicDictionary } from "@/lib/public-i18n";

export type DiscordWidgetModalState = { mode: "create" } | { mode: "edit"; widget: DiscordWidgetRow };

const TOGGLES: { key: "showMemberCount" | "showAvatars" | "showVoiceChannels" | "showJoinButton"; labelKey: keyof Dictionary["widgets"] }[] = [
  { key: "showMemberCount", labelKey: "discordShowMemberCount" },
  { key: "showAvatars", labelKey: "discordShowAvatars" },
  { key: "showVoiceChannels", labelKey: "discordShowVoiceChannels" },
  { key: "showJoinButton", labelKey: "discordShowJoinButton" },
];

type FloatingPosition = "left-top" | "left-middle" | "left-bottom" | "right-top" | "right-middle" | "right-bottom";
const FLOATING_POSITION_LABEL_KEY: Record<string, keyof Dictionary["widgets"]> = {
  "left-top": "positionLeftTop",
  "left-middle": "positionLeftMiddle",
  "left-bottom": "positionLeftBottom",
  "right-top": "positionRightTop",
  "right-middle": "positionRightMiddle",
  "right-bottom": "positionRightBottom",
};

const previewT = getPublicDictionary("en");

// Modal (Dialog), bukan form inline nempel di halaman -- konsisten sama pola Add/Edit Link
// (link-form-modal.tsx): tombol "+ Tambah" buka popup, ada Batal/Simpan di footer. Client
// component (bukan ActionForm) -- saveDiscordWidgetAction butuh nampilin pesan error
// SPESIFIK (ID salah vs widget belum diaktifkan di Discord), ActionForm cuma nyediain 1
// pesan gagal generic buat semua kasus (lihat komentarnya di action-form.tsx). Semua field
// dikontrol (bukan defaultValue) SEKALIGUS biar bisa nge-drive preview kartu widget di kanan.
export function DiscordWidgetFormModal({
  pageId,
  state,
  theme,
  t,
  onClose,
}: {
  pageId: number;
  state: DiscordWidgetModalState | null;
  theme: ThemeTokens;
  t: Dictionary;
  onClose: () => void;
}) {
  const router = useRouter();
  const config = state?.mode === "edit" ? state.widget : null;
  const widgetId = state?.mode === "edit" ? state.widget.id : null;

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [guildId, setGuildId] = useState(config?.guildId ?? "");
  const [title, setTitle] = useState(config?.title ?? "");
  const [style, setStyle] = useState(config?.style ?? "custom");
  const [placementMode, setPlacementMode] = useState(config?.placementMode ?? "inline");
  const [floatingPosition, setFloatingPosition] = useState(config?.floatingPosition ?? "left-middle");
  const [showMemberCount, setShowMemberCount] = useState(config?.showMemberCount ?? true);
  const [showAvatars, setShowAvatars] = useState(config?.showAvatars ?? true);
  const [showVoiceChannels, setShowVoiceChannels] = useState(config?.showVoiceChannels ?? true);
  const [showJoinButton, setShowJoinButton] = useState(config?.showJoinButton ?? true);

  const [previewData, setPreviewData] = useState<DiscordWidgetData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Debounce 500ms -- guildId ngetik per-karakter, jangan mukul Discord tiap keystroke.
  // guildId invalid/style iframe: gak fetch, TAPI previewData lama sengaja dibiarin apa
  // adanya (bukan di-reset di sini) -- JSX di bawah yang mutusin nampilin apa nggak, biar
  // gak ada setState sinkron langsung di body effect (react-hooks/set-state-in-effect).
  const isValidGuildId = /^\d+$/.test(guildId);
  useEffect(() => {
    if (!isValidGuildId || style === "iframe") return;
    const timeout = setTimeout(() => {
      setPreviewLoading(true);
      fetch(`/api/discord-widget?guildId=${guildId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(setPreviewData)
        .catch(() => setPreviewData(null))
        .finally(() => setPreviewLoading(false));
    }, 500);
    return () => clearTimeout(timeout);
  }, [guildId, style, isValidGuildId]);

  if (!state) return null;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await saveDiscordWidgetAction(pageId, widgetId, undefined, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    // saveDiscordWidgetAction dipanggil dari fungsi client di sini (bukan langsung
    // <form action={saveDiscordWidgetAction}>), jadi Next GAK otomatis refresh Server
    // Component setelahnya -- tanpa ini, list widget keliatan "gak berubah" sampe user
    // refresh manual, padahal DB-nya udah kesimpen bener (sama kasusnya kayak runAction()
    // di board.tsx).
    router.refresh();
    onClose();
  }

  const previewConfig = { style, title: title || null, showMemberCount, showAvatars, showVoiceChannels, showJoinButton };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{state.mode === "edit" ? t.widgets.discordEditTitle : t.widgets.discordAddTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <form id="discord-widget-form" action={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="discordWidgetName">{t.widgets.discordNameLabel}</Label>
                <Input id="discordWidgetName" name="name" placeholder="Server Kopi" defaultValue={config?.name ?? ""} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="discordWidgetGuildId">{t.widgets.discordGuildIdLabel}</Label>
                <Input
                  id="discordWidgetGuildId"
                  name="guildId"
                  placeholder="713098654931484743"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value.trim())}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t.widgets.discordGuildIdHint}</p>

            {style !== "iframe" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="discordWidgetTitle">{t.widgets.discordTitleLabel}</Label>
                <Input
                  id="discordWidgetTitle"
                  name="title"
                  placeholder={t.widgets.discordTitlePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="discordWidgetStyle">{t.widgets.discordStyleLabel}</Label>
                <SelectField id="discordWidgetStyle" name="style" value={style} onChange={(e) => setStyle(e.target.value as typeof style)}>
                  <option value="custom">{t.widgets.styleCustom}</option>
                  <option value="discord">{t.widgets.styleDiscord}</option>
                  <option value="classic">{t.widgets.styleClassic}</option>
                  <option value="iframe">{t.widgets.styleIframe}</option>
                </SelectField>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="discordWidgetPlacementMode">{t.widgets.discordPlacementLabel}</Label>
                <SelectField
                  id="discordWidgetPlacementMode"
                  name="placementMode"
                  value={placementMode}
                  onChange={(e) => setPlacementMode(e.target.value as "floating" | "inline")}
                >
                  <option value="inline">{t.widgets.placementInline}</option>
                  <option value="floating">{t.widgets.placementFloating}</option>
                </SelectField>
              </div>
            </div>

            {placementMode === "floating" ? (
              <div className="flex flex-col gap-1.5">
                <Label>{t.widgets.discordFloatingPositionLabel}</Label>
                <DiscordPositionPicker
                  value={floatingPosition ?? "left-middle"}
                  onChange={(v) => setFloatingPosition(v as FloatingPosition)}
                  labelFor={(v) => t.widgets[FLOATING_POSITION_LABEL_KEY[v]]}
                  mainContentLabel={t.widgets.discordMainContentLabel}
                />
                <input type="hidden" name="floatingPosition" value={floatingPosition ?? "left-middle"} />
              </div>
            ) : (
              <p className="text-xs font-medium text-destructive">{t.widgets.discordInlineHint}</p>
            )}

            {style === "iframe" ? null : (
              <div className="grid grid-cols-2 gap-2">
                {TOGGLES.map(({ key, labelKey }) => {
                  const checked = { showMemberCount, showAvatars, showVoiceChannels, showJoinButton }[key];
                  const setChecked = { showMemberCount: setShowMemberCount, showAvatars: setShowAvatars, showVoiceChannels: setShowVoiceChannels, showJoinButton: setShowJoinButton }[key];
                  return (
                    <label key={key} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm">
                      <span>{t.widgets[labelKey]}</span>
                      <Switch checked={checked} onCheckedChange={setChecked} />
                      <input type="hidden" name={key} value={checked ? "1" : ""} />
                    </label>
                  );
                })}
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </form>

          <div className="flex flex-col gap-1.5">
            <Label>{t.widgets.discordPreviewLabel}</Label>
            <div
              className="flex min-h-[220px] items-center justify-center rounded-xl border p-4"
              style={{ backgroundColor: style === "custom" ? theme.backgroundColors[0] : "#1e1f22" }}
            >
              {style === "iframe" ? (
                guildId ? (
                  <DiscordIframe guildId={guildId} />
                ) : (
                  <p className="text-xs text-muted-foreground">{t.widgets.discordPreviewEmpty}</p>
                )
              ) : previewData && isValidGuildId ? (
                <DiscordWidgetCard data={previewData} config={previewConfig} theme={theme} t={previewT} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {previewLoading ? t.common.saving : t.widgets.discordPreviewEmpty}
                </p>
              )}
            </div>
            {style !== "iframe" && showJoinButton && previewData && !previewData.instantInvite ? (
              <p className="text-xs text-destructive">{t.widgets.discordJoinButtonUnavailableHint}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="discord-widget-form" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
