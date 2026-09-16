"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { IconPicker, EmojiPicker } from "@/components/icon-picker";
import { CropFileInput } from "@/components/crop-file-input";
import { cn } from "@/lib/utils";
import type { BoardLink, LinkType } from "@/lib/db/board";
import type { Dictionary } from "@/lib/i18n";
import { parseAccordionItems, type AccordionItem } from "@/lib/link-render";
import { saveLinkAction } from "./actions";

type MediaTab = "thumbnail" | "icon" | "emoji";
const MEDIA_TABS: MediaTab[] = ["thumbnail", "icon", "emoji"];

const LINK_TYPES: LinkType[] = ["url", "email", "phone", "whatsapp", "file", "embed", "copy", "accordion"];

const URL_LABEL: Record<LinkType, (t: Dictionary) => string> = {
  url: (t) => t.linkModal.urlLabel,
  email: (t) => t.linkModal.urlLabelEmail,
  phone: (t) => t.linkModal.urlLabelPhone,
  whatsapp: (t) => t.linkModal.urlLabelWhatsapp,
  file: (t) => t.linkModal.urlLabelFile,
  embed: (t) => t.linkModal.urlLabelEmbed,
  copy: (t) => t.linkModal.urlLabelCopy,
  accordion: (t) => t.linkModal.urlLabelAccordion,
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
};

// File input gak punya komponen shadcn -- style manual disamain sama Input (border-input,
// rounded-lg) biar satu keluarga visual, cuma bagian file:* yang beda karena itu tombolnya sendiri.
const FILE_INPUT_CLASS =
  "text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground";

export type LinkModalState = { mode: "create"; groupId: number | null } | { mode: "edit"; link: BoardLink };

export function LinkFormModal({
  pageId,
  groups,
  state,
  t,
  onClose,
  onSaved,
}: {
  pageId: number;
  groups: { id: number; name: string }[];
  state: LinkModalState | null;
  t: Dictionary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [icon, setIcon] = useState(state?.mode === "edit" ? (state.link.icon ?? "") : "");
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>(state?.mode === "edit" ? state.link.linkType : "url");
  const [featured, setFeatured] = useState(state?.mode === "edit" ? state.link.featured : false);
  const [mediaTab, setMediaTab] = useState<MediaTab>("thumbnail");
  const [accordionItems, setAccordionItems] = useState<AccordionItem[]>(() => {
    if (state?.mode === "edit" && state.link.linkType === "accordion") {
      const parsed = parseAccordionItems(state.link.url);
      return parsed.length > 0 ? parsed : [{ label: "", url: "" }];
    }
    return [{ label: "", url: "" }];
  });

  function updateAccordionItem(index: number, field: keyof AccordionItem, value: string) {
    setAccordionItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }
  function addAccordionItem() {
    setAccordionItems((prev) => [...prev, { label: "", url: "" }]);
  }
  function removeAccordionItem(index: number) {
    setAccordionItems((prev) => prev.filter((_, i) => i !== index));
  }

  if (!state) return null;

  const linkId = state.mode === "edit" ? state.link.id : null;
  const defaultTarget =
    state.mode === "edit"
      ? state.link.groupId
        ? `group:${state.link.groupId}`
        : "ungrouped"
      : state.groupId
        ? `group:${state.groupId}`
        : "ungrouped";

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{state.mode === "edit" ? t.linkModal.editTitle : t.linkModal.addTitle}</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="mt-2 flex flex-col gap-5">
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
            <div className="flex flex-col gap-1.5">
              <Label>{t.linkModal.accordionItemsLabel}</Label>
              <p className="text-xs text-muted-foreground">{t.linkModal.accordionItemsHint}</p>
              <div className="flex flex-col gap-2">
                {accordionItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder={t.linkModal.accordionItemLabelPlaceholder}
                      value={item.label}
                      onChange={(e) => updateAccordionItem(i, "label", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder={t.linkModal.accordionItemUrlPlaceholder}
                      value={item.url}
                      onChange={(e) => updateAccordionItem(i, "url", e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeAccordionItem(i)}
                      title={t.linkModal.accordionRemoveItem}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
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
          ) : (
            <div className="flex flex-col gap-1.5">
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
              <SelectField id="target" name="target" defaultValue={defaultTarget}>
                <option value="ungrouped">{t.board.noGroup}</option>
                {groups.map((g) => (
                  <option key={g.id} value={`group:${g.id}`}>
                    {g.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayStyle">{t.linkModal.styleLabel}</Label>
              <SelectField
                id="displayStyle"
                name="displayStyle"
                defaultValue={state.mode === "edit" ? state.link.displayStyle : "pill"}
              >
                <option value="pill">{t.linkModal.styleOptions.pill}</option>
                <option value="rich">{t.linkModal.styleOptions.rich}</option>
                <option value="icon">{t.linkModal.styleOptions.icon}</option>
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
                <CropFileInput id="thumbnail" name="thumbnail" aspect={16 / 9} className={FILE_INPUT_CLASS} t={t} />
              </div>
            ) : null}

            {mediaTab === "icon" ? <IconPicker value={icon} onChange={setIcon} t={t} showEmoji={false} /> : null}

            {mediaTab === "emoji" ? <EmojiPicker value={icon} onChange={setIcon} t={t} /> : null}

            <input type="hidden" name="removeThumbnail" value={removeThumbnail ? "1" : ""} />
            <input type="hidden" name="icon" value={icon} />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5">
            <span className="text-sm font-medium">{t.linkModal.featuredLabel}</span>
            <input
              type="checkbox"
              name="featured"
              value="1"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="size-4 rounded accent-primary"
            />
          </label>

          {linkType === "url" ? (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <span className="text-xs font-medium text-muted-foreground">{t.linkModal.utmLabel}</span>
              <div className="grid grid-cols-3 gap-2">
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
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
