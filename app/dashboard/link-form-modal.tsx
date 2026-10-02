"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Star, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { IconPicker, EmojiPicker } from "@/components/icon-picker";
import { CropFileInput } from "@/components/crop-file-input";
import { HeightCropFileInput } from "@/components/height-crop-file-input";
import { Switch } from "@/components/ui/switch";
import { GroupFormModal, type GroupModalState } from "./group-form-modal";
import { DateTimePicker } from "@/components/datetime-picker";
import { cn, FILE_INPUT_CLASS } from "@/lib/utils";
import type { BoardLink, DisplayStyle, LinkType } from "@/lib/db/board";
import type { Dictionary, Locale } from "@/lib/i18n";
import { parseAccordionItems, parseCountdownData, type AccordionItem } from "@/lib/link-render";
import type { DiscordWidgetRow } from "@/lib/db/discord-widget";
import type { ImageButtonRow } from "@/lib/db/image-buttons";
import type { LinkStyleOverride } from "@/lib/link-style";
import type { ThemeTokens } from "@/lib/theme";
import { LinkStyleOverrideSection } from "./link-style-override";
import { LinkStyleStage } from "./link-style-stage";
import { saveLinkAction } from "./actions";
import { createImageButtonAction } from "./image-button-actions";
import { useObjectUrl } from "./use-object-url";

type MediaTab = "thumbnail" | "icon" | "emoji";
const MEDIA_TABS: MediaTab[] = ["thumbnail", "icon", "emoji"];

const LINK_TYPES: LinkType[] = [
  "url",
  "email",
  "phone",
  "whatsapp",
  "file",
  "embed",
  "copy",
  "accordion",
  "countdown",
  "discord_widget",
];

const URL_LABEL: Record<LinkType, (t: Dictionary) => string> = {
  url: (t) => t.linkModal.urlLabel,
  email: (t) => t.linkModal.urlLabelEmail,
  phone: (t) => t.linkModal.urlLabelPhone,
  whatsapp: (t) => t.linkModal.urlLabelWhatsapp,
  file: (t) => t.linkModal.urlLabelFile,
  embed: (t) => t.linkModal.urlLabelEmbed,
  copy: (t) => t.linkModal.urlLabelCopy,
  accordion: (t) => t.linkModal.urlLabelAccordion,
  countdown: (t) => t.linkModal.urlLabelCountdown,
  discord_widget: () => "",
};

const URL_PLACEHOLDER: Record<LinkType, string> = {
  url: "https://...",
  email: "name@example.com",
  phone: "+62 812 3456 7890",
  whatsapp: "+62 812 3456 7890",
  file: "https://... (opsional kalau upload file di bawah)",
  embed: "https://www.youtube.com/watch?v=...",
  copy: "PROMO2026",
  accordion: "",
  countdown: "",
  discord_widget: "",
};

// <input type="datetime-local"> butuh "YYYY-MM-DDTHH:mm" di JAM LOKAL browser (bukan ISO/UTC)
// -- dua fungsi ini yang jembatanin ke/dari ISO string yang beneran disimpan (lihat
// CountdownData di lib/link-render.ts).
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function datetimeLocalToIso(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export type LinkModalState = { mode: "create"; groupId: number | null } | { mode: "edit"; link: BoardLink };

export function LinkFormModal({
  pageId,
  groups,
  discordWidgets,
  imageButtons,
  containerWidth,
  theme,
  state,
  t,
  locale,
  onClose,
  onCreateGroup,
  onSaved,
}: {
  pageId: number;
  groups: { id: number; name: string }[];
  discordWidgets: DiscordWidgetRow[];
  imageButtons: ImageButtonRow[];
  // Cuma buat teks hint displayStyle "image" ("lebar gambar maks Xpx") -- ikut lebar
  // halaman publik dari theme aktif, lihat lib/theme.ts containerWidth.
  containerWidth: number;
  // Theme page aktif: titik awal nilai override (disalin saat kelompok dinyalakan).
  theme: ThemeTokens;
  state: LinkModalState | null;
  t: Dictionary;
  locale: Locale;
  onClose: () => void;
  // Buat tombol "+ tambah group" di dalam form ini (lihat quick-add group di bawah) --
  // WAJIB async & balikin data grup barunya, beda dari onSubmit GroupFormModal yang
  // biasa (fire-and-forget), soalnya di sini butuh id-nya buat auto-select ke dropdown
  // target tanpa nutup modal Link ini.
  onCreateGroup: (name: string) => Promise<{ id: number; name: string } | null>;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Cuma widget mode "inline" yang valid buat dipasang lewat link -- widget floating
  // udah nempel sendiri di layar (lihat FloatingDiscordWidgets), jadi gak relevan dipilih
  // di sini walau tetep ada di daftar Integrations.
  const inlineDiscordWidgets = discordWidgets.filter((w) => w.placementMode === "inline");
  const [icon, setIcon] = useState(state?.mode === "edit" ? (state.link.icon ?? "") : "");
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [removeContentImage, setRemoveContentImage] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>(state?.mode === "edit" ? state.link.linkType : "url");
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>(state?.mode === "edit" ? state.link.displayStyle : "pill");
  const [selectedWidgetId, setSelectedWidgetId] = useState(() => {
    if (state?.mode === "edit" && state.link.linkType === "discord_widget") {
      try {
        const parsed = JSON.parse(state.link.url);
        if (typeof parsed?.widgetId === "number" && inlineDiscordWidgets.some((w) => w.id === parsed.widgetId)) {
          return String(parsed.widgetId);
        }
      } catch {
        // JSON korup -- fallback ke default di bawah.
      }
    }
    return inlineDiscordWidgets[0] ? String(inlineDiscordWidgets[0].id) : "";
  });
  // Widget yang tadinya dipakai link ini udah gak ada di daftar mode "inline" saat ini --
  // entah dihapus (ID gak nemu, referensi by-ID gak "connect balik" ke widget baru walau
  // namanya sama persis, SQLite AUTOINCREMENT gak pernah reuse ID lama) atau diganti ke
  // mode floating -- user perlu pilih ulang widgetnya.
  const [widgetWasDeleted] = useState(() => {
    if (state?.mode !== "edit" || state.link.linkType !== "discord_widget") return false;
    try {
      const parsed = JSON.parse(state.link.url);
      return typeof parsed?.widgetId === "number" && !inlineDiscordWidgets.some((w) => w.id === parsed.widgetId);
    } catch {
      return true;
    }
  });
  const [featured, setFeatured] = useState(state?.mode === "edit" ? state.link.featured : false);
  const [mediaTab, setMediaTab] = useState<MediaTab>("thumbnail");
  // Section "Image / Icon" dipakai dua mode: displayStyle biasa (thumbnailPath) dan "image" +
  // toggle show-content (gambar kecil terpisah dari banner -> imageContentPath/contentImage).
  const isImageStyle = displayStyle === "image";
  const existingMediaPath =
    state?.mode === "edit" ? (isImageStyle ? state.link.imageContentPath : state.link.thumbnailPath) : null;
  const removeMedia = isImageStyle ? removeContentImage : removeThumbnail;
  const setRemoveMedia = isImageStyle ? setRemoveContentImage : setRemoveThumbnail;
  const [imageShowTitle, setImageShowTitle] = useState(state?.mode === "edit" ? state.link.imageShowTitle : false);
  const [imageShowContent, setImageShowContent] = useState(state?.mode === "edit" ? state.link.imageShowContent : false);
  const [imageHideBorder, setImageHideBorder] = useState(state?.mode === "edit" ? state.link.imageHideBorder : false);
  const [imageHideBackground, setImageHideBackground] = useState(state?.mode === "edit" ? state.link.imageHideBackground : false);
  const [imageButtonId, setImageButtonId] = useState<number | null>(state?.mode === "edit" ? state.link.imageButtonId : null);
  const [title, setTitle] = useState(state?.mode === "edit" ? state.link.title : "");
  const [styleOverride, setStyleOverride] = useState<LinkStyleOverride | null>(state?.mode === "edit" ? state.link.styleOverride : null);
  const [target, setTarget] = useState(() => {
    if (state?.mode === "edit") return state.link.groupId ? `group:${state.link.groupId}` : "ungrouped";
    if (state?.mode === "create" && state.groupId) return `group:${state.groupId}`;
    return "ungrouped";
  });
  const [quickAddGroupOpen, setQuickAddGroupOpen] = useState(false);
  const [accordionItems, setAccordionItems] = useState<AccordionItem[]>(() => {
    if (state?.mode === "edit" && state.link.linkType === "accordion") {
      const parsed = parseAccordionItems(state.link.url);
      return parsed.length > 0 ? parsed : [{ label: "", url: "", type: "url" }];
    }
    return [{ label: "", url: "", type: "url" }];
  });
  const [countdownEndsAt, setCountdownEndsAt] = useState(() => {
    if (state?.mode === "edit" && state.link.linkType === "countdown") {
      const parsed = parseCountdownData(state.link.url);
      if (parsed) return isoToDatetimeLocal(parsed.endsAt);
    }
    return "";
  });
  const [countdownUrl, setCountdownUrl] = useState(() => {
    if (state?.mode === "edit" && state.link.linkType === "countdown") {
      const parsed = parseCountdownData(state.link.url);
      if (parsed) return parsed.url;
    }
    return "";
  });

  function updateAccordionItem(index: number, field: "label" | "url", value: string) {
    setAccordionItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }
  function setAccordionItemType(index: number, type: AccordionItem["type"]) {
    setAccordionItems((prev) => prev.map((item, i) => (i === index ? { ...item, type } : item)));
  }
  function addAccordionItem() {
    setAccordionItems((prev) => [...prev, { label: "", url: "", type: "url" }]);
  }
  function removeAccordionItem(index: number) {
    setAccordionItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Pratinjau gambar yang baru dipilih (hasil crop, belum disimpan) buat panggung preview:
  // gambar kecil (thumbnail/icon) dan banner card style Image dipisah. Hook-hook ini harus
  // SEBELUM early return di bawah (aturan hooks).
  const [pendingMediaUrl, handleMediaFile] = useObjectUrl();
  const [bannerFileUrl, setBannerFile] = useObjectUrl();
  // Upload image baru (card style Image): disimpan ke library lewat tombol sendiri, bukan nunggu
  // Save form -- biar jelas kapan gambarnya udah masuk dan langsung terpilih.
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [savingNew, setSavingNew] = useState(false);
  const [newImageError, setNewImageError] = useState<string | null>(null);
  const [newImageSaved, setNewImageSaved] = useState(false);

  if (!state) return null;

  const linkId = state.mode === "edit" ? state.link.id : null;

  async function handleQuickCreateGroup(name: string) {
    const created = await onCreateGroup(name);
    setQuickAddGroupOpen(false);
    if (created) setTarget(`group:${created.id}`);
  }

  function handleNewFile(file: File | null) {
    setNewFile(file);
    setBannerFile(file);
    setNewImageSaved(false);
    setNewImageError(null);
  }

  async function handleSaveNewImage() {
    if (!newFile || !newLabel.trim()) return;
    setSavingNew(true);
    setNewImageError(null);
    const fd = new FormData();
    fd.set("label", newLabel.trim());
    fd.set("image", newFile);
    const result = await createImageButtonAction(fd);
    setSavingNew(false);
    if (result.error || result.id === undefined) {
      setNewImageError(result.error ?? "Gambar gagal disimpan.");
      return;
    }
    // Langsung terpilih; daftar image button (props dari server) ikut ke-refresh biar kartunya muncul.
    setImageButtonId(result.id);
    setNewLabel("");
    handleNewFile(null);
    setUploadKey((k) => k + 1);
    setNewImageSaved(true);
    router.refresh();
  }

  // onSubmit manual (BUKAN <form action>): React 19 mereset form otomatis begitu action selesai,
  // termasuk pas action-nya balikin error validasi -- input file/URL jadi kosong dan <select>
  // Card style balik ke opsi pertama (Pill) di layar. Dengan onSubmit, form cuma ke-reset
  // kalau modalnya memang ditutup (sukses simpan).
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    return handleSubmit(new FormData(e.currentTarget));
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await saveLinkAction(pageId, linkId, undefined, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <>
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{state.mode === "edit" ? t.linkModal.editTitle : t.linkModal.addTitle}</DialogTitle>
        </DialogHeader>

        <form id="link-form" onSubmit={handleFormSubmit} className="mt-2 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">{t.linkModal.titleLabel}</Label>
            <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="linkType">{t.linkModal.typeLabel}</Label>
            <SelectField
              id="linkType"
              name="linkType"
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as LinkType)}
            >
              {LINK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t.linkModal.typeOptions[type]}
                </option>
              ))}
            </SelectField>
          </div>

          {linkType === "accordion" ? (
            <div key="accordion-fields" className="flex flex-col gap-1.5">
              <Label>{t.linkModal.accordionItemsLabel}</Label>
              <p className="text-xs text-muted-foreground">{t.linkModal.accordionItemsHint}</p>
              <div className="flex flex-col gap-2">
                {accordionItems.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1.5 rounded-lg border p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={t.linkModal.accordionItemLabelPlaceholder}
                        value={item.label}
                        onChange={(e) => updateAccordionItem(i, "label", e.target.value)}
                        className="flex-1"
                      />
                      <SelectField
                        className="w-32 shrink-0"
                        value={item.type ?? "url"}
                        onChange={(e) => setAccordionItemType(i, e.target.value as AccordionItem["type"])}
                      >
                        <option value="url">{t.linkModal.accordionItemTypeUrl}</option>
                        <option value="copy">{t.linkModal.accordionItemTypeCopy}</option>
                      </SelectField>
                      <button
                        type="button"
                        onClick={() => removeAccordionItem(i)}
                        title={t.linkModal.accordionRemoveItem}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <Input
                      placeholder={
                        item.type === "copy" ? t.linkModal.accordionItemCopyPlaceholder : t.linkModal.accordionItemUrlPlaceholder
                      }
                      value={item.url}
                      onChange={(e) => updateAccordionItem(i, "url", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-1 w-fit gap-1.5" onClick={addAccordionItem}>
                <Plus className="size-3.5" />
                {t.linkModal.accordionAddItem}
              </Button>
              <input
                type="hidden"
                name="url"
                value={JSON.stringify(accordionItems.filter((it) => it.label.trim() || it.url.trim()))}
              />
            </div>
          ) : linkType === "countdown" ? (
            <div key="countdown-fields" className="flex flex-col gap-1.5">
              <Label htmlFor="countdownEndsAt">{t.linkModal.countdownEndsAtLabel}</Label>
              <DateTimePicker
                id="countdownEndsAt"
                value={countdownEndsAt}
                onChange={setCountdownEndsAt}
                locale={locale}
                t={t}
                required
              />
              <Label htmlFor="countdownUrl">{t.linkModal.urlLabelCountdown}</Label>
              <Input
                id="countdownUrl"
                placeholder="https://..."
                value={countdownUrl}
                onChange={(e) => setCountdownUrl(e.target.value)}
                required
              />
              <input
                type="hidden"
                name="url"
                value={JSON.stringify({ endsAt: datetimeLocalToIso(countdownEndsAt), url: countdownUrl })}
              />
            </div>
          ) : linkType === "discord_widget" ? (
            <div key="discord-widget-fields" className="flex flex-col gap-1.5">
              <Label htmlFor="discordWidgetPick">{t.linkModal.discordWidgetPickLabel}</Label>
              {inlineDiscordWidgets.length > 0 ? (
                <>
                  {widgetWasDeleted ? <p className="text-xs font-medium text-destructive">{t.linkModal.discordWidgetResetHint}</p> : null}
                  <SelectField id="discordWidgetPick" value={selectedWidgetId} onChange={(e) => setSelectedWidgetId(e.target.value)}>
                    {inlineDiscordWidgets.map((widget) => (
                      <option key={widget.id} value={widget.id}>
                        {widget.name}
                      </option>
                    ))}
                  </SelectField>
                  {/* Cuma nyimpen ID (referensi LIVE) -- bukan snapshot semua field-nya, biar
                      edit config di tab Integrations > Discord langsung kepake di sini juga. */}
                  <input type="hidden" name="url" value={selectedWidgetId ? JSON.stringify({ widgetId: Number(selectedWidgetId) }) : ""} />
                </>
              ) : (
                <p className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {t.linkModal.discordWidgetEmptyHint}
                </p>
              )}
            </div>
          ) : (
            <div key="generic-fields" className="flex flex-col gap-1.5">
              <Label htmlFor="url">{URL_LABEL[linkType](t)}</Label>
              <Input
                id="url"
                name="url"
                placeholder={URL_PLACEHOLDER[linkType]}
                defaultValue={state.mode === "edit" ? state.link.url : ""}
                required={linkType !== "file"}
              />
              {linkType === "file" ? (
                <>
                  <p className="text-xs text-muted-foreground">{t.linkModal.fileUploadHint}</p>
                  <input name="file" type="file" className={FILE_INPUT_CLASS} />
                </>
              ) : null}
              {linkType === "whatsapp" ? (
                <p className="text-xs text-muted-foreground">{t.linkModal.whatsappFormatHint}</p>
              ) : null}
            </div>
          )}

          {linkType !== "discord_widget" && displayStyle !== "image" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">{t.linkModal.descLabel}</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={state.mode === "edit" ? (state.link.description ?? "") : ""}
              />
            </div>
          ) : null}

          <div className={cn("grid gap-3", linkType === "discord_widget" ? "grid-cols-1" : "grid-cols-2")}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="target">{t.linkModal.groupLabel}</Label>
              <div className="flex items-center gap-1.5">
                <SelectField
                  id="target"
                  name="target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="flex-1"
                >
                  <option value="ungrouped">{t.board.noGroup}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={`group:${g.id}`}>
                      {g.name}
                    </option>
                  ))}
                </SelectField>
                {/* Bikin group baru tanpa nutup form Link ini -- klik buka dialog nama group
                    kecil di ATAS modal ini, abis submit langsung ke-pilih di dropdown atas. */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={t.board.addGroup}
                  onClick={() => setQuickAddGroupOpen(true)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {linkType !== "discord_widget" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="displayStyle">{t.linkModal.styleLabel}</Label>
                <SelectField
                  id="displayStyle"
                  name="displayStyle"
                  value={displayStyle}
                  onChange={(e) => setDisplayStyle(e.target.value as DisplayStyle)}
                >
                  <option value="pill">{t.linkModal.styleOptions.pill}</option>
                  <option value="rich">{t.linkModal.styleOptions.rich}</option>
                  <option value="image">{t.linkModal.styleOptions.image}</option>
                </SelectField>
              </div>
            ) : null}
          </div>

          {linkType !== "discord_widget" && displayStyle === "image" ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t.linkModal.imageSizeHint.replace("{width}", String(containerWidth))}
              </p>

              <div className="flex flex-col gap-2">
                <Label className="text-xs">{t.linkModal.imagePickerLabel}</Label>
                {imageButtons.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t.linkModal.imagePickerEmpty}</p>
                ) : (
                  <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto">
                    {imageButtons.map((button) => (
                      <button
                        key={button.id}
                        type="button"
                        onClick={() => setImageButtonId(button.id)}
                        className={cn(
                          "flex flex-col gap-1 rounded-lg border bg-card p-2 text-left transition-colors",
                          imageButtonId === button.id ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- gambar sudah webp */}
                        <img src={`/uploads/${button.path}`} alt="" className="max-h-12 w-full rounded object-contain" />
                        <span className="truncate text-xs font-medium">{button.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                <input type="hidden" name="imageButtonId" value={imageButtonId ?? ""} />
              </div>

              <div className="flex flex-col gap-2 border-t pt-3">
                <Label className="text-xs">{t.linkModal.imageUploadNewLabel}</Label>
                <Input
                  name="newImageButtonLabel"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    setNewImageSaved(false);
                  }}
                  placeholder={t.linkModal.imageNewLabelPlaceholder}
                />
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    {/* key: abis disimpan, input file di-mount ulang biar kosong lagi. */}
                    <HeightCropFileInput
                      key={uploadKey}
                      id="newImageButtonFile"
                      name="newImageButtonFile"
                      outputWidth={containerWidth}
                      className={FILE_INPUT_CLASS}
                      t={t}
                      onFileChange={handleNewFile}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!newFile || !newLabel.trim() || savingNew}
                    onClick={handleSaveNewImage}
                  >
                    {t.linkModal.imageSaveNew}
                  </Button>
                </div>
                {newFile && !newLabel.trim() ? (
                  <p className="text-xs text-muted-foreground">{t.linkModal.imageSaveHint}</p>
                ) : null}
                {newImageError ? <p className="text-xs font-medium text-destructive">{newImageError}</p> : null}
                {newImageSaved ? <p className="text-xs font-medium text-primary">{t.linkModal.imageSavedNotice}</p> : null}
              </div>

              <div className="mt-1 flex flex-col gap-2 border-t pt-3">
                <Label className="text-xs font-medium">{t.linkModal.imageOverrideLabel}</Label>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm">{t.linkModal.imageHideBorderLabel}</p>
                  <Switch checked={imageHideBorder} onCheckedChange={setImageHideBorder} />
                </div>
                <input type="hidden" name="imageHideBorder" value={imageHideBorder ? "1" : ""} />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm">{t.linkModal.imageHideBackgroundLabel}</p>
                  <Switch checked={imageHideBackground} onCheckedChange={setImageHideBackground} />
                </div>
                <input type="hidden" name="imageHideBackground" value={imageHideBackground ? "1" : ""} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="imageRadius" className="text-xs">
                      {t.linkModal.imageRadiusLabel}
                    </Label>
                    <Input
                      id="imageRadius"
                      name="imageRadius"
                      type="number"
                      min={0}
                      max={100}
                      placeholder={t.linkModal.imageRadiusPlaceholder}
                      defaultValue={state.mode === "edit" && state.link.imageRadius !== null ? state.link.imageRadius : ""}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="imageShadow" className="text-xs">
                      {t.linkModal.imageShadowLabel}
                    </Label>
                    <SelectField id="imageShadow" name="imageShadow" defaultValue={state.mode === "edit" ? state.link.imageShadow : "theme"}>
                      <option value="theme">{t.linkModal.imageShadowTheme}</option>
                      <option value="none">{t.linkModal.imageShadowNone}</option>
                      <option value="sm">{t.linkModal.imageShadowSm}</option>
                      <option value="md">{t.linkModal.imageShadowMd}</option>
                      <option value="lg">{t.linkModal.imageShadowLg}</option>
                    </SelectField>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {linkType !== "discord_widget" && displayStyle === "image" ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm">{t.linkModal.imageShowTitleLabel}</p>
                <Switch checked={imageShowTitle} onCheckedChange={setImageShowTitle} />
                <input type="hidden" name="imageShowTitle" value={imageShowTitle ? "1" : ""} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm">{t.linkModal.imageShowContentLabel}</p>
                <Switch checked={imageShowContent} onCheckedChange={setImageShowContent} />
                <input type="hidden" name="imageShowContent" value={imageShowContent ? "1" : ""} />
              </div>
            </div>
          ) : null}

          {linkType !== "discord_widget" && (displayStyle !== "image" || imageShowContent) ? (
            <div className="flex flex-col gap-1.5">
              <Label>{t.linkModal.mediaLabel}</Label>
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                {MEDIA_TABS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setMediaTab(key);
                      // Input file-nya ikut ke-unmount pas ganti tab -> pilihan lama gak bakal kekirim.
                      handleMediaFile(null);
                    }}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      mediaTab === key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {key === "thumbnail" && t.linkModal.mediaTabThumbnail}
                    {key === "icon" && t.linkModal.mediaTabIcon}
                    {key === "emoji" && t.linkModal.mediaTabEmoji}
                  </button>
                ))}
              </div>

              {mediaTab === "thumbnail" ? (
                <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
                  {state.mode === "edit" && existingMediaPath && !removeMedia ? (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- preview thumbnail yang sudah diupload */}
                      <img
                        src={`/uploads/${existingMediaPath}`}
                        alt=""
                        className="size-14 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setRemoveMedia(true)}
                        className="flex items-center gap-1 text-xs font-medium text-destructive transition-colors hover:text-destructive/80"
                      >
                        <Trash2 className="size-3.5" />
                        {t.linkModal.removeThumbnail}
                      </button>
                    </div>
                  ) : null}
                  <CropFileInput
                    id={isImageStyle ? "contentImage" : "thumbnail"}
                    name={isImageStyle ? "contentImage" : "thumbnail"}
                    aspect={displayStyle === "rich" ? 16 / 9 : 1}
                    className={FILE_INPUT_CLASS}
                    t={t}
                    onFileChange={handleMediaFile}
                  />
                </div>
              ) : null}

              {mediaTab === "icon" ? <IconPicker value={icon} onChange={setIcon} t={t} showEmoji={false} /> : null}

              {mediaTab === "emoji" ? <EmojiPicker value={icon} onChange={setIcon} t={t} /> : null}

              <input type="hidden" name={isImageStyle ? "removeContentImage" : "removeThumbnail"} value={removeMedia ? "1" : ""} />
              <input type="hidden" name="icon" value={icon} />
            </div>
          ) : null}

          {linkType !== "discord_widget" && displayStyle === "image" && !imageShowContent ? (
            <input type="hidden" name="icon" value="" />
          ) : null}

          <input type="hidden" name="featured" value={featured ? "1" : ""} />

          {/* Gaya khusus link: setelah Image / Icon, sebelum UTM. Panggung preview-nya (sticky)
              ada di dalam section ini, bukan di preview HP kanan. */}
          {displayStyle !== "icon" ? (
            <>
              <LinkStyleOverrideSection
                theme={theme}
                value={styleOverride}
                onChange={setStyleOverride}
                t={t}
                stage={
                  <LinkStyleStage
                    theme={theme}
                    override={styleOverride}
                    t={t}
                    locale={locale}
                    link={{
                      title,
                      displayStyle,
                      icon: icon || null,
                      featured,
                      // Image: banner = image button terpilih, gambar kecil = hasil crop baru atau
                      // yang tersimpan. Lainnya: thumbnail = hasil crop baru atau yang tersimpan.
                      thumbnailPath:
                        displayStyle === "image"
                          ? (bannerFileUrl ??
                            imageButtons.find((b) => b.id === imageButtonId)?.path ??
                            (state.mode === "edit" ? state.link.thumbnailPath : null))
                          : (pendingMediaUrl ??
                            (state.mode === "edit" && !removeThumbnail ? state.link.thumbnailPath : null)),
                      imageContentPath:
                        displayStyle === "image"
                          ? (pendingMediaUrl ??
                            (state.mode === "edit" && !removeContentImage ? state.link.imageContentPath : null))
                          : null,
                      imageHideBorder,
                      imageHideBackground,
                      imageShowTitle,
                      imageShowContent,
                    }}
                  />
                }
              />
              <input type="hidden" name="styleOverride" value={styleOverride ? JSON.stringify(styleOverride) : ""} />
            </>
          ) : null}

          {linkType === "url" ? (
            <details className="group rounded-lg border p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                {t.linkModal.utmLabel}
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Input
                  name="utmSource"
                  placeholder={t.linkModal.utmSource}
                  defaultValue={state.mode === "edit" ? (state.link.utmSource ?? "") : ""}
                  className="h-8 text-xs"
                />
                <Input
                  name="utmMedium"
                  placeholder={t.linkModal.utmMedium}
                  defaultValue={state.mode === "edit" ? (state.link.utmMedium ?? "") : ""}
                  className="h-8 text-xs"
                />
                <Input
                  name="utmCampaign"
                  placeholder={t.linkModal.utmCampaign}
                  defaultValue={state.mode === "edit" ? (state.link.utmCampaign ?? "") : ""}
                  className="h-8 text-xs"
                />
              </div>
            </details>
          ) : null}

        </form>
        </div>

        {/* Error simpan ditaruh di sini (di luar area scroll, tepat di atas footer), bukan di
            akhir form: kalau di akhir form harus scroll lewat semua section buat lihat pesannya. */}
        {error ? (
          <p role="alert" className="border-t border-destructive/30 bg-destructive/10 px-6 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {/* DialogFooter default-nya "-mx-4 -mb-4" buat nyamain sama padding p-4 bawaan
            DialogContent -- di sini DialogContent udah p-0 (scroll area sendiri yang p-6),
            jadi margin negatifnya dibatalin biar footer gak nembus keluar card. flex-row
            (bukan default flex-col-reverse) + justify-between: Favorite mentok kiri,
            Batal+Simpan ngumpul di kanan. */}
        <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between">
          <Button
            type="button"
            variant={featured ? "default" : "outline"}
            size="icon"
            title={t.linkModal.favoriteLabel}
            onClick={() => setFeatured((v) => !v)}
          >
            <Star className={cn("size-4", featured && "fill-current")} />
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" form="link-form" disabled={pending}>
              {pending ? t.common.saving : t.common.save}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <GroupFormModal
      state={quickAddGroupOpen ? ({ mode: "create" } satisfies GroupModalState) : null}
      t={t}
      onClose={() => setQuickAddGroupOpen(false)}
      onSubmit={(name) => handleQuickCreateGroup(name)}
    />
    </>
  );
}
