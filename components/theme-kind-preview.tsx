"use client";

import { useEffect, useRef } from "react";
import type { ThemeTokens } from "@/lib/theme";

const DEFAULT_TEXTURE_COLORS: Partial<Record<ThemeTokens["textureType"], string[]>> = {
  particle: ["#fef08a", "#fde047"],
  firefly: ["#5eead4"],
  snow: ["#ffffff"],
  sakura: ["#fecdd3", "#fda4af"],
};

// Preview STATIS (bukan animasi -- gak ada requestAnimationFrame, cuma gambar sekali
// pas mount) khusus buat card kecil di gallery preset/theme saya. Dua masalah yang ini
// benerin:
// 1. backgroundType network/gravity/blackhole butuh CANVAS buat nunjukin bentuk aslinya
//    (titik+garis, glow, dsb) -- tanpa ini cuma keliatan warna dasar polos/dot-grid statis.
// 2. textureType particle/firefly/snow/sakura di real app di-generate pakai satuan
//    vw/vh (buat halaman publik yang selebar viewport) -- di card kecil ini, vw/vh
//    ngitung dari lebar LAYAR BROWSER, bukan dari lebar card, jadi titik-titiknya
//    "terbang" jauh ke luar card yang cuma ~240px lebar dan gak kelihatan sama sekali.
//    Canvas di sini gambar ulang pakai satuan piksel RELATIF ke card sendiri.
// Sengaja SATU frame doang (bukan pakai komponen background asli yang punya rAF loop) --
// kalau ~40 card render bareng sekaligus tiap buka tab Theme, puluhan rAF loop jalan
// bareng bakal berat; gambar sekali udah cukup buat nunjukin bentuk aslinya.
export function ThemeKindPreview({ tokens }: { tokens: ThemeTokens }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isTextureDots =
    tokens.textureType === "particle" ||
    tokens.textureType === "firefly" ||
    tokens.textureType === "snow" ||
    tokens.textureType === "sakura";
  const isCanvasBackground =
    tokens.backgroundType === "network" || tokens.backgroundType === "gravity" || tokens.backgroundType === "blackhole";
  const shouldRender = isCanvasBackground || isTextureDots;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !shouldRender) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    const colors = tokens.backgroundColors;

    // Hash integer deterministik (bukan Math.random()) -- posisi titik harus SAMA tiap
    // re-render (mis. pas kartu lain di grid berubah state), jangan "loncat-loncat".
    function seed(n: number): number {
      let x = Math.imul(n, 2654435761) ^ 0;
      x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
      x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
      x ^= x >>> 16;
      return (x >>> 0) / 4294967296;
    }

    if (tokens.backgroundType === "network") {
      ctx.fillStyle = colors[0] ?? "#111";
      ctx.fillRect(0, 0, w, h);
      const dotColor = colors[1] ?? "#22d3ee";
      const dots = Array.from({ length: 16 }, (_, i) => ({ x: seed(i * 2 + 1) * w, y: seed(i * 2 + 2) * h }));
      const linkDist = Math.max(w, h) * 0.32;
      ctx.strokeStyle = dotColor;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < linkDist) {
            ctx.globalAlpha = 0.55 * (1 - dist / linkDist);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = dotColor;
      dots.forEach((d) => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (tokens.backgroundType === "gravity") {
      ctx.fillStyle = colors[0] ?? "#111";
      ctx.fillRect(0, 0, w, h);
      const glow = colors[1] ?? "#67b5bf";
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.22;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
      g.addColorStop(0, glow + "cc");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.arc(seed(i * 3 + 1) * w, seed(i * 3 + 2) * h, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (tokens.backgroundType === "blackhole") {
      ctx.fillStyle = colors[0] ?? "#050608";
      ctx.fillRect(0, 0, w, h);
      const hot = colors[1] ?? "#fff4d6";
      const mid = colors[2] ?? "#ff8a3d";
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.24;
      ctx.save();
      ctx.translate(cx, cy);
      const outer = ctx.createRadialGradient(0, 0, r, 0, 0, r * 4);
      outer.addColorStop(0, "rgba(0,0,0,.2)");
      outer.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(0, 0, r * 4, 0, Math.PI * 2);
      ctx.fillStyle = outer;
      ctx.fill();

      ctx.save();
      ctx.rotate((-22 * Math.PI) / 180);
      ctx.scale(1, 0.32);
      const diskOuter = r * 2.4;
      const disk = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, diskOuter);
      disk.addColorStop(0, "rgba(255,255,255,.95)");
      disk.addColorStop(0.35, hot + "e6");
      disk.addColorStop(0.7, mid + "aa");
      disk.addColorStop(1, "rgba(90,20,10,0)");
      ctx.beginPath();
      ctx.arc(0, 0, diskOuter, 0, Math.PI * 2);
      ctx.fillStyle = disk;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();

      ctx.globalCompositeOperation = "screen";
      const rim = ctx.createRadialGradient(0, 0, r * 0.88, 0, 0, r * 1.12);
      rim.addColorStop(0, "rgba(255,255,255,0)");
      rim.addColorStop(0.8, "rgba(255,255,255,0)");
      rim.addColorStop(1, "rgba(255,244,214,.9)");
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }

    if (isTextureDots) {
      // Canvas TRANSPARAN (gak di-fillRect) -- ini overlay TEKSTUR di atas background
      // yang udah digambar CSS di elemen parent, bukan gantiin background-nya.
      const fallback = DEFAULT_TEXTURE_COLORS[tokens.textureType] ?? ["#ffffff"];
      const palette = tokens.textureColors && tokens.textureColors.length > 0 ? tokens.textureColors : fallback;
      const blurred = tokens.textureType === "firefly";
      for (let i = 0; i < 14; i++) {
        const x = seed(i * 4 + 1) * w;
        const y = seed(i * 4 + 2) * h;
        const size = blurred ? 4 + seed(i * 4 + 3) * 5 : 1.6 + seed(i * 4 + 3) * 1.6;
        const color = palette[i % palette.length];
        if (blurred) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, size);
          g.addColorStop(0, color);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = color;
        }
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isTextureDots/isCanvasBackground/shouldRender diturunin dari tokens, gak perlu masuk deps sendiri
  }, [tokens.backgroundType, tokens.textureType, tokens.backgroundColors.join(","), tokens.textureColors?.join(",")]);

  if (!shouldRender) return null;
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />;
}
