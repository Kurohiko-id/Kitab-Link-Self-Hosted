"use client";

import { useEffect, useRef } from "react";

// Adaptasi CodePen "Color Changin'" (alexzaworski) -- klik di mana aja di halaman bikin
// warna background "meleber" (radial reveal) dari titik klik ke warna berikutnya di
// palette, dibarengin cincin ripple + ledakan partikel kecil yang mancar keluar terus
// menyusut. Sumber aslinya pakai anime.js buat easing; di sini di-reimplementasi pakai
// easing manual (easeOutQuart/easeOutExpo) biar gak nambah dependency baru. Sengaja BEDA
// dari sumber aslinya: sumbernya ada auto-demo click abis 2 detik nganggur -- di sini
// DIHAPUS, warna cuma boleh berubah kalau visitor beneran klik.
export function ColorMorphBackground({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const palette = colors.length > 1 ? colors.slice(1) : colors.length > 0 ? colors : ["#ff6138", "#ffbe53"];
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    // Resting state = warna dasar tema (backgroundColors[0]), BUKAN warna aksen pertama --
    // biar gak keliatan "ganti warna sendiri" sesaat setelah canvas mount, sebelum diklik.
    let bgColor = colors[0] ?? palette[0];
    let paletteIndex = 0;
    function nextColor() {
      paletteIndex = (paletteIndex + 1) % palette.length;
      return palette[paletteIndex];
    }

    function easeOutQuart(t: number) {
      return 1 - Math.pow(1 - t, 4);
    }
    function easeOutExpo(t: number) {
      return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    type Fill = { x: number; y: number; r: number; targetR: number; duration: number; start: number; color: string; done: boolean };
    type Ripple = { x: number; y: number; r: number; targetR: number; duration: number; start: number; color: string };
    type Burst = { x: number; y: number; r: number; startR: number; dx: number; dy: number; duration: number; start: number; color: string };

    let fills: Fill[] = [];
    let ripples: Ripple[] = [];
    let bursts: Burst[] = [];

    function calcPageFillRadius(x: number, y: number) {
      const l = Math.max(x, width - x);
      const h = Math.max(y, height - y);
      return Math.sqrt(l * l + h * h);
    }

    function triggerAt(x: number, y: number) {
      const now = performance.now();
      const currentColor = palette[paletteIndex];
      const upcoming = nextColor();
      const targetR = calcPageFillRadius(x, y);
      const rippleSize = Math.min(200, width * 0.4);

      fills.push({ x, y, r: 0, targetR, duration: Math.max(targetR * 2.2, 750), start: now, color: upcoming, done: false });
      ripples.push({ x, y, r: 0, targetR: rippleSize, duration: 900, start: now, color: currentColor });
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = rippleSize * (0.6 + Math.random() * 0.55);
        bursts.push({
          x,
          y,
          r: 24 + Math.random() * 24,
          startR: 24 + Math.random() * 24,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          duration: 1000 + Math.random() * 300,
          start: now,
          color: currentColor,
        });
      }
    }

    function handlePointer(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      triggerAt(e.clientX - rect.left, e.clientY - rect.top);
    }
    window.addEventListener("click", handlePointer);

    let rafId: number;
    function tick() {
      const now = performance.now();
      ctx!.fillStyle = bgColor;
      ctx!.fillRect(0, 0, width, height);

      fills = fills.filter((f) => {
        const t = Math.min((now - f.start) / f.duration, 1);
        f.r = easeOutQuart(t) * f.targetR;
        if (t >= 1 && !f.done) {
          bgColor = f.color;
          f.done = true;
        }
        ctx!.beginPath();
        ctx!.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx!.fillStyle = f.color;
        ctx!.fill();
        return t < 1;
      });

      ripples = ripples.filter((r) => {
        const t = Math.min((now - r.start) / r.duration, 1);
        r.r = easeOutExpo(t) * r.targetR;
        ctx!.globalAlpha = 1 - t;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx!.strokeStyle = r.color;
        ctx!.lineWidth = 3;
        ctx!.stroke();
        ctx!.globalAlpha = 1;
        return t < 1;
      });

      bursts = bursts.filter((b) => {
        const t = Math.min((now - b.start) / b.duration, 1);
        const e = easeOutExpo(t);
        const x = b.x + b.dx * e;
        const y = b.y + b.dy * e;
        const r = b.startR * (1 - e);
        if (r > 0.3) {
          ctx!.beginPath();
          ctx!.arc(x, y, r, 0, Math.PI * 2);
          ctx!.fillStyle = b.color;
          ctx!.fill();
        }
        return t < 1;
      });

      rafId = requestAnimationFrame(tick);
    }
    tick();

    function handleResize() {
      if (!canvas) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", handlePointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sengaja cuma re-init pas warna berubah
  }, [colors.join(",")]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />;
}
