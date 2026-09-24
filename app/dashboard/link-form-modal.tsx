"use client";

import { useState } from "react";
import { ChevronDown, Plus, Star, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { IconPicker, EmojiPicker } from "@/components/icon-picker";
import { CropFileInput } from "@/components/crop-file-input";
import { GroupFormModal, type GroupModalState } from "./group-form-modal";
import { DateTimePicker } from "@/components/datetime-picker";
import { cn, FILE_INPUT_CLASS } from "@/lib/utils";
import type { BoardLink, DisplayStyle, LinkType } from "@/lib/db/board";
import type { Dictionary, Locale } from "@/lib/i18n";
import { parseAccordionItems, parseCountdownData, type AccordionItem } from "@/lib/link-render";
import { saveLinkAction } from "./actions";

type MediaTab = "thumbnail" | "icon" | "emoji";
const MEDIA_TABS: MediaTab[] = ["thumbnail", "icon", "emoji"];

const LINK_TYPES: LinkType[] = ["url", "email", "phone", "whatsapp", "file", "embed", "copy", "accordion", "countdown"];

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
  state,
  t,
  locale,
  onClose,
  onCreateGroup,
  onSaved,
}: {
  pageId: number;
  groups: { id: number; name: string }[];
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
  const [icon, setIcon] = useState(state?.mode === "edit" ? (state.link.icon ?? "") : "");
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>(state?.mode === "edit" ? state.link.linkType : "url");
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>(state?.mode === "edit" ? state.link.displayStyle : "pill");
  const [featured, setFeatured] = useState(state?.mode === "edit" ? state.link.featured : false);
  const [mediaTab, setMediaTab] = useState<MediaTab>("thumbnail");
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

  if (!state) return null;

  const linkId = state.mode === "edit" ? state.link.id : null;

  async function handleQuickCreateGroup(name: string) {
    const created = await onCreateGroup(name);
    setQuickAddGroupOpen(false);
    if (created) setTarget(`group:${created.id}`);
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

        <form id="link-form" action={handleSubmit} className="mt-2 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">{t.linkModal.titleLabel}</Label>
            <Input id="title" name="title" defaultValue={state.mode === "edit" ? state.link.title : ""} required />
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">{t.linkModal.descLabel}</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={state.mode === "edit" ? (state.link.description ?? "") : ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              </SelectField>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t.linkModal.mediaLabel}</Label>
            <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              {MEDIA_TABS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMediaTab(key)}
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
                {state.mode === "edit" && state.link.thumbnailPath && !removeThumbnail ? (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview thumbnail yang sudah diupload */}
                    <img
                      src={`/uploads/${state.link.thumbnailPath}`}
                      alt=""
                      className="size-14 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setRemoveThumbnail(true)}
                      className="flex items-center gap-1 text-xs font-medium text-destructive transition-colors hover:text-destructive/80"
                    >
                      <Trash2 className="size-3.5" />
                      {t.linkModal.removeThumbnail}
                    </button>
                  </div>
                ) : null}
                <CropFileInput
                  id="thumbnail"
                  name="thumbnail"
                  aspect={displayStyle === "rich" ? 16 / 9 : 1}
                  className={FILE_INPUT_CLASS}
                  t={t}
                />
              </div>
            ) : null}

            {mediaTab === "icon" ? <IconPicker value={icon} onChange={setIcon} t={t} showEmoji={false} /> : null}

            {mediaTab === "emoji" ? <EmojiPicker value={icon} onChange={setIcon} t={t} /> : null}

            <input type="hidden" name="removeThumbnail" value={removeThumbnail ? "1" : ""} />
            <input type="hidden" name="icon" value={icon} />
          </div>

          <input type="hidden" name="featured" value={featured ? "1" : ""} />

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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
        </div>

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
