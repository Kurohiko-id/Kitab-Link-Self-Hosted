"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

// react-easy-crop default minZoom=1 = crop box selalu "cover" (gambar diisi penuh) --
// kalau aspect ratio gambar aslinya beda jauh dari aspect target, user gak akan pernah
// bisa lihat seluruh gambar walau slider zoom udah di paling kiri. Turunin minZoom biar
// beneran bisa zoom out ngelewatin titik cover-fit itu.
const MIN_ZOOM = 0.5;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedBlob(imageSrc: string, area: Area, mimeType: string): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), mimeType);
  });
}

// Pengganti drop-in buat <input type="file"> biasa -- form/server action pemanggil GAK
// perlu berubah sama sekali. Abis user pilih gambar, dibuka dialog crop (react-easy-crop),
// hasil crop-nya di-canvas-in jadi Blob lalu "disuntik balik" ke input file asli lewat
// DataTransfer (trik standar buat isi FileList secara programatic) -- pas form di-submit,
// FormData baca file yang UDAH di-crop, server action tetap terima File biasa kayak sebelumnya.
export function CropFileInput({
  id,
  name,
  accept = "image/*",
  aspect,
  round = false,
  className,
  t,
}: {
  id?: string;
  name: string;
  accept?: string;
  aspect: number;
  round?: boolean;
  className?: string;
  t: Dictionary;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedAreaRef = useRef<Area | null>(null);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setRawFile(file);
    setRawSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    croppedAreaRef.current = null;
  }

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    croppedAreaRef.current = areaPixels;
  }, []);

  function closeDialog() {
    if (rawSrc) URL.revokeObjectURL(rawSrc);
    setRawSrc(null);
    setRawFile(null);
  }

  async function handleApply() {
    if (!rawSrc || !rawFile || !croppedAreaRef.current || !inputRef.current) return;
    const mimeType = rawFile.type;
    const blob = await getCroppedBlob(rawSrc, croppedAreaRef.current, mimeType);
    const cropped = new File([blob], rawFile.name, { type: mimeType });
    const dt = new DataTransfer();
    dt.items.add(cropped);
    inputRef.current.files = dt.files;
    closeDialog();
  }

  function handleCancel() {
    if (inputRef.current) inputRef.current.value = "";
    closeDialog();
  }

  return (
    <>
      <input ref={inputRef} id={id} name={name} type="file" accept={accept} onChange={handleSelect} className={className} />

      <Dialog open={rawSrc !== null} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.common.cropImageTitle}</DialogTitle>
          </DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            {rawSrc ? (
              <Cropper
                image={rawSrc}
                crop={crop}
                zoom={zoom}
                minZoom={MIN_ZOOM}
                aspect={aspect}
                cropShape={round ? "round" : "rect"}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : null}
          </div>
          <input
            type="range"
            min={MIN_ZOOM}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className={cn("w-full accent-primary")}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t.common.cancel}
            </Button>
            <Button type="button" onClick={handleApply}>
              {t.common.cropApply}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
