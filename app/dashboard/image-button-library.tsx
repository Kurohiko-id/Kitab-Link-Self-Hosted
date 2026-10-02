"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeightCropFileInput } from "@/components/height-crop-file-input";
import { cn, FILE_INPUT_CLASS } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";
import type { ImageButtonRow } from "@/lib/db/image-buttons";
import {
  createImageButtonAction,
  deleteImageButtonAction,
  renameImageButtonAction,
  replaceImageButtonImageAction,
} from "./image-button-actions";

type Mode = "upload" | "placeholder";

// Pilihan sumber gambar: upload+crop (komponen yang sama kayak card style Image) atau
// placeholder solid (digenerate server). Field mode/placeholder* dibaca readImageButtonWebp.
function SourceFields({ t, outputWidth }: { t: Dictionary; outputWidth: number }) {
  const [mode, setMode] = useState<Mode>("upload");
  const labels: Record<Mode, string> = { upload: t.imageButtons.modeUpload, placeholder: t.imageButtons.modePlaceholder };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["upload", "placeholder"] as Mode[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              "flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              mode === key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={mode} />
      {mode === "upload" ? (
        <HeightCropFileInput id="ib-image" name="image" outputWidth={outputWidth} className={FILE_INPUT_CLASS} t={t} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ib-color" className="text-xs">{t.imageButtons.colorLabel}</Label>
            <Input id="ib-color" name="placeholderColor" type="color" defaultValue="#000000" className="h-9 p-1" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ib-width" className="text-xs">{t.imageButtons.widthLabel}</Label>
            <Input id="ib-width" name="placeholderWidth" type="number" min={16} max={2000} defaultValue={outputWidth} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ib-height" className="text-xs">{t.imageButtons.heightLabel}</Label>
            <Input id="ib-height" name="placeholderHeight" type="number" min={16} max={2000} defaultValue={56} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ImageButtonLibrary({
  buttons,
  containerWidth,
  t,
}: {
  buttons: ImageButtonRow[];
  containerWidth: number;
  t: Dictionary;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [replacing, setReplacing] = useState<ImageButtonRow | null>(null);
  // Bump setiap create sukses -> remount form biar file input + crop bersih lagi.
  const [formKey, setFormKey] = useState(0);

  // onSubmit manual (bukan form action) -- React 19 auto-reset form abis action sukses
  // bikin input kelihatan balik ke nilai lama; kita reset sendiri lewat formKey.
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createImageButtonAction(new FormData(e.currentTarget));
    setPending(false);
    if (result.error) return setError(result.error);
    setFormKey((k) => k + 1);
    router.refresh();
  }

  async function handleReplace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!replacing) return;
    setPending(true);
    setError(null);
    const result = await replaceImageButtonImageAction(replacing.id, new FormData(e.currentTarget));
    setPending(false);
    if (result.error) return setError(result.error);
    setReplacing(null);
    router.refresh();
  }

  async function handleRename(button: ImageButtonRow, label: string) {
    if (!label.trim() || label === button.label) return;
    const result = await renameImageButtonAction(button.id, label);
    if (result.error) setError(result.error);
    router.refresh();
  }

  async function handleDelete(button: ImageButtonRow) {
    if (!window.confirm(t.imageButtons.deleteConfirm)) return;
    const result = await deleteImageButtonAction(button.id);
    if (result.error) setError(result.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold">{t.imageButtons.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t.imageButtons.desc}</p>

        <form key={formKey} onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 rounded-lg border bg-muted/50 p-3">
          <p className="text-xs font-medium">{t.imageButtons.addTitle}</p>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ib-label" className="text-xs">{t.imageButtons.labelField}</Label>
            <Input id="ib-label" name="label" placeholder={t.imageButtons.labelPlaceholder} required />
          </div>
          <SourceFields t={t} outputWidth={containerWidth} />
          <div>
            <Button type="submit" size="sm" disabled={pending}>{t.imageButtons.createButton}</Button>
          </div>
        </form>

        {error ? (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {buttons.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.imageButtons.emptyHint}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {buttons.map((button) => (
            <div key={button.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- gambar sudah diproses jadi webp sendiri */}
              <img src={`/uploads/${button.path}`} alt="" className="max-h-24 w-full rounded-lg object-contain" />
              <Input
                defaultValue={button.label}
                aria-label={t.imageButtons.rename}
                onBlur={(e) => handleRename(button, e.target.value)}
                className="h-8 text-sm font-medium"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {button.usedCount > 0 ? t.imageButtons.usedIn.replace("{count}", String(button.usedCount)) : t.imageButtons.unused}
                </span>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setReplacing(button)}>
                    <Pencil className="size-3.5" />
                    {t.imageButtons.replaceImage}
                  </Button>
                  <Button type="button" size="icon" variant="outline" title={t.imageButtons.delete} onClick={() => handleDelete(button)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {replacing ? (
        <Dialog open onOpenChange={(open) => !open && setReplacing(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t.imageButtons.replaceTitle}: {replacing.label}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReplace} className="flex flex-col gap-3">
              <SourceFields t={t} outputWidth={containerWidth} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReplacing(null)}>{t.common.cancel}</Button>
                <Button type="submit" disabled={pending}>{t.imageButtons.replaceApply}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
