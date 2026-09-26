"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n";

const MIN_SELECTION_PX = 10; // px ASLI gambar, bukan px tampilan

type DragMode = "top" | "bottom" | "move";

// Beda dari CropFileInput (react-easy-crop, aspect ratio TETAP + pan/zoom dalam box) --
// ini khusus displayStyle "image": lebar SELALU penuh gambar (gak ada crop horizontal
// sama sekali), cuma tinggi yang diatur user lewat drag garis atas/bawah, geser seleksi,
// atau ketik angka tinggi.
//
// Posisi garis disimpan sebagai FRAKSI (0..1) tinggi gambar, BUKAN px tampilan -- dulu
// disimpan sebagai px tampilan dan bikin angka tingginya goyang sendiri tiap ukuran
// preview berubah. Sekarang angka tinggi murni turunan pixel asli, kebal ke ukuran preview.
export function HeightCropFileInput({
  id,
  name,
  accept = "image/*",
  outputWidth,
  className,
  t,
}: {
  id?: string;
  name: string;
  accept?: string;
  // Lebar halaman publik (theme.containerWidth) -- dipakai buat nerjemahin tinggi crop
  // ke tinggi NYATA tombol nanti di halaman. Tanpa ini, angka tingginya dalam px gambar
  // asli dan nyasar jauh (gambar 1920px yang di-crop 56px cuma jadi ~16px di halaman).
  outputWidth: number;
  className?: string;
  t: Dictionary;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ mode: DragMode; startY: number; startTop: number; startBottom: number } | null>(null);

  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [naturalWidth, setNaturalWidth] = useState(0);
  // Tinggi gambar SETELAH di-render (dibatasi max-h/max-w CSS) -- diukur, bukan dihitung,
  // biar gak perlu nebak lebar dialog dan tetep akurat kalau dialognya resize.
  const [displayHeight, setDisplayHeight] = useState(0);
  const [topFrac, setTopFrac] = useState(0);
  const [bottomFrac, setBottomFrac] = useState(1);
  // Teks mentah selama user ngetik di kolom tinggi -- kalau angkanya langsung di-clamp
  // tiap ketukan, ngetik nilai baru jadi berantakan (mis. "2" keburu jadi "10").
  // null = kolomnya nampilin angka turunan dari seleksi (kondisi normal).
  const [heightDraft, setHeightDraft] = useState<string | null>(null);

  const loaded = naturalHeight > 0 && displayHeight > 0;
  const topPx = topFrac * displayHeight;
  const bottomPx = bottomFrac * displayHeight;
  // Gambar di halaman publik dibatasi max-width container, tapi TIDAK di-upscale kalau
  // aslinya lebih kecil (lihat components/link-card.tsx) -- makanya pakai min().
  const outputScale = loaded ? Math.min(1, outputWidth / naturalWidth) : 1;
  const heightPx = loaded ? Math.round((bottomFrac - topFrac) * naturalHeight * outputScale) : 0;

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    setDisplayHeight(img.clientHeight);
    const observer = new ResizeObserver(([entry]) => setDisplayHeight(entry.contentRect.height));
    observer.observe(img);
    return () => observer.disconnect();
  }, [rawSrc]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      const img = imgRef.current;
      if (!drag || !img) return;
      const rect = img.getBoundingClientRect();
      if (rect.height === 0) return;
      const gap = MIN_SELECTION_PX / (naturalHeight || 1);
      if (drag.mode === "move") {
        const size = drag.startBottom - drag.startTop;
        const deltaFrac = (e.clientY - drag.startY) / rect.height;
        const nextTop = Math.max(0, Math.min(1 - size, drag.startTop + deltaFrac));
        setTopFrac(nextTop);
        setBottomFrac(nextTop + size);
        return;
      }
      const frac = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      if (drag.mode === "top") setTopFrac(Math.min(frac, drag.startBottom - gap));
      else setBottomFrac(Math.max(frac, drag.startTop + gap));
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [naturalHeight]);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setRawFile(file);
    setRawSrc(URL.createObjectURL(file));
    setNaturalHeight(0);
    setNaturalWidth(0);
    setDisplayHeight(0);
    setTopFrac(0);
    setBottomFrac(1);
    setHeightDraft(null);
  }

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNaturalWidth(img.naturalWidth);
    setNaturalHeight(img.naturalHeight);
    setDisplayHeight(img.clientHeight);
  }

  // Begitu garisnya ditarik, angka tinggi balik ngikutin seleksi (draft ketikan dibuang).
  function handlePointerDownTop(e: React.PointerEvent) {
    e.preventDefault();
    setHeightDraft(null);
    dragRef.current = { mode: "top", startY: e.clientY, startTop: topFrac, startBottom: bottomFrac };
  }
  function handlePointerDownBottom(e: React.PointerEvent) {
    e.preventDefault();
    setHeightDraft(null);
    dragRef.current = { mode: "bottom", startY: e.clientY, startTop: topFrac, startBottom: bottomFrac };
  }
  function handlePointerDownMove(e: React.PointerEvent) {
    e.preventDefault();
    setHeightDraft(null);
    dragRef.current = { mode: "move", startY: e.clientY, startTop: topFrac, startBottom: bottomFrac };
  }

  // Angka tinggi dalam px ASLI gambar -- garis atas dibiarin diam, cuma garis bawah yang
  // ngikutin, konsisten sama drag garis bawah. Teks yang diketik TIDAK di-clamp sambil
  // jalan (cuma ditahan di draft), seleksinya baru ikut begitu angkanya udah masuk akal --
  // biar ngetik "56" gak keburu dibenerin jadi "106" di tengah jalan.
  function handleHeightInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setHeightDraft(raw);
    if (!loaded) return;
    const parsed = Number(raw);
    if (!raw.trim() || !Number.isFinite(parsed) || parsed < MIN_SELECTION_PX) return;
    // Angka yang diketik = tinggi di HALAMAN -> balik dulu ke px gambar asli.
    setBottomFrac(Math.min(1, topFrac + parsed / outputScale / naturalHeight));
  }

  // Lepas fokus = balik nampilin angka asli seleksi (yang udah ke-clamp), jadi draft yang
  // gak valid (kosong / di bawah minimum) gak nyangkut di layar.
  function handleHeightInputBlur() {
    setHeightDraft(null);
  }

  function closeDialog() {
    if (rawSrc) URL.revokeObjectURL(rawSrc);
    setRawSrc(null);
    setRawFile(null);
  }

  async function handleApply() {
    const img = imgRef.current;
    if (!rawFile || !img || !inputRef.current || !loaded) return;
    const sy = topFrac * naturalHeight;
    const sHeight = (bottomFrac - topFrac) * naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = naturalWidth;
    canvas.height = Math.max(1, Math.round(sHeight));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, sy, naturalWidth, sHeight, 0, 0, naturalWidth, sHeight);
    const mimeType = rawFile.type;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), mimeType),
    );
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

          {/* Kotak preview: gambar SELALU muat utuh (max-h + max-w), jadi gak pernah ada
              scrollbar dan gak perlu zoom buat lihat bagian yang kepotong. */}
          <div className="w-full overflow-hidden rounded-lg bg-muted">
            {rawSrc ? (
              <div className="relative mx-auto w-fit max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element -- source lokal (blob URL), bukan kandidat next/image */}
                <img
                  ref={imgRef}
                  src={rawSrc}
                  alt=""
                  draggable={false}
                  onLoad={handleImageLoad}
                  className="block max-h-[340px] w-auto max-w-full select-none"
                />
                {loaded ? (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/60" style={{ height: topPx }} />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60" style={{ top: bottomPx }} />
                    <div
                      className="pointer-events-none absolute inset-x-0 border-y-2 border-white"
                      style={{ top: topPx, height: bottomPx - topPx }}
                    />
                    {/* Drag di badan seleksi -> geser posisi (atas+bawah bareng), bukan resize. */}
                    <div
                      onPointerDown={handlePointerDownMove}
                      className="absolute inset-x-0 cursor-move touch-none"
                      style={{ top: topPx, height: bottomPx - topPx }}
                    />
                    <div
                      onPointerDown={handlePointerDownTop}
                      className="absolute inset-x-0 flex h-5 -translate-y-1/2 cursor-ns-resize touch-none items-center justify-center"
                      style={{ top: topPx }}
                    >
                      <div className="h-1.5 w-12 rounded-full bg-white shadow" />
                    </div>
                    <div
                      onPointerDown={handlePointerDownBottom}
                      className="absolute inset-x-0 flex h-5 -translate-y-1/2 cursor-ns-resize touch-none items-center justify-center"
                      style={{ top: bottomPx }}
                    >
                      <div className="h-1.5 w-12 rounded-full bg-white shadow" />
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t.linkModal.imageCropHeightLabel}</span>
            <Input
              type="number"
              min={MIN_SELECTION_PX}
              max={loaded ? Math.round(naturalHeight * outputScale) : undefined}
              value={heightDraft ?? String(heightPx)}
              onChange={handleHeightInputChange}
              onBlur={handleHeightInputBlur}
              disabled={!loaded}
              className="h-7 w-24 text-xs"
            />
            <span>px</span>
          </div>

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
