"use client";

import { useEffect, useRef } from "react";

// Adaptasi CodePen "gravity point" (canvas Vector/GravityPoint) -- klik di mana aja di
// halaman nambahin titik gravitasi: dia narik SEMUA partikel dikit (bukan cuma yang
// deket, sengaja gak pakai inverse-square biar gak ada singularity), tumbuh masuk
// (ease-in) pas lahir, dan kalau beberapa titik gravitasi ketemu/deket dia GABUNG jadi
// satu titik lebih gede (radius nambah) -- begitu radius gabungannya kelewat batas, dia
// "collapse" (mengempis lalu ilang). Titik gravitasi jugaSALING NARIK SATU SAMA LAIN
// (bukan cuma narik partikel) -- titik yang lebih gede/udah nyerap lebih banyak (gravity
// field-nya lebih kuat) narik titik yang lebih kecil, PERSIS mekanisme di source aslinya.
// Bisa di-drag: mousedown di atas titik yang udah ada = geser dia (bukan bikin baru),
// mousedown di tempat kosong = bikin titik gravitasi baru. Partikel digambar sebagai
// trail comet (canvas buffer terpisah yang di-fade pelan tiap frame lewat
// destination-out) biar ada jejak gerak, bukan cuma titik statis. Listener mouse
// dipasang ke `window` (bukan ke canvas), canvas sendiri tetap pointer-events:none,
// biar klik ke link/tombol di atasnya tetap tembus normal.
export function GravityDustBackground({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const glowColor = colors[1] ?? "#67b5bf";
    const accentColor = colors[2] ?? "#ffc400";
    const particleCount = 90;
    const particleRadius = 1.2;
    const initialGravityRadius = 10;
    const collapseLimit = 65;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;
    const bufferCtx = buffer.getContext("2d")!;

    type Vec = { x: number; y: number };
    function vecLength(v: Vec) {
      return Math.sqrt(v.x * v.x + v.y * v.y);
    }
    function vecNormalize(v: Vec): Vec {
      const m = vecLength(v);
      return m ? { x: v.x / m, y: v.y / m } : { x: 0, y: 0 };
    }

    class Particle {
      x: number;
      y: number;
      lastX: number;
      lastY: number;
      vx: number;
      vy: number;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.lastX = x;
        this.lastY = y;
        this.vx = (Math.random() * 2 - 1) * 0.6;
        this.vy = (Math.random() * 2 - 1) * 0.6;
      }
      addSpeed(dx: number, dy: number) {
        this.vx += dx;
        this.vy += dy;
      }
      update() {
        const speed = vecLength({ x: this.vx, y: this.vy });
        if (speed > 3) {
          const n = vecNormalize({ x: this.vx, y: this.vy });
          this.vx = n.x * 3;
          this.vy = n.y * 3;
        }
        this.lastX = this.x;
        this.lastY = this.y;
        this.x += this.vx;
        this.y += this.vy;
        // Mantul di tepi (BUKAN teleport ke sisi seberang) -- trail comet digambar dari
        // lastX/lastY ke posisi baru tiap frame, kalau teleport garisnya ikut "meloncat"
        // nyambungin dua sisi kanvas jadi glitch garis horizontal/vertikal penuh layar.
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
        this.x = Math.min(Math.max(this.x, 0), width);
        this.y = Math.min(Math.max(this.y, 0), height);
      }
    }

    class GravityPoint {
      x: number;
      y: number;
      radius: number;
      currentRadius: number;
      gravity = 0.045;
      destroyed = false;
      collapsing = false;
      dragging = false;
      // Akumulator gaya SATU FRAME (bukan velocity persisten) -- diisi titik lain lewat
      // addSpeed(), dipakai & di-reset di akhir step() milik sendiri. Kalau dibikin
      // velocity persisten (nambah terus tanpa direset), gerakannya bakal makin lama
      // makin liar/gak kekontrol.
      private vx = 0;
      private vy = 0;
      private easeRadius = 0;
      private dragOffsetX = 0;
      private dragOffsetY = 0;
      constructor(x: number, y: number, radius: number) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.currentRadius = radius * 0.5;
      }
      addSpeed(dx: number, dy: number) {
        this.vx += dx;
        this.vy += dy;
      }
      hitTest(x: number, y: number) {
        return Math.hypot(this.x - x, this.y - y) < Math.max(this.currentRadius, 14);
      }
      startDrag(mx: number, my: number) {
        this.dragOffsetX = mx - this.x;
        this.dragOffsetY = my - this.y;
        this.dragging = true;
      }
      drag(mx: number, my: number) {
        this.x = mx - this.dragOffsetX;
        this.y = my - this.dragOffsetY;
      }
      endDrag() {
        this.dragging = false;
      }
      collapse() {
        this.currentRadius *= 1.75;
        this.collapsing = true;
      }
      step(particles: Particle[], gravities: GravityPoint[]) {
        if (this.destroyed) return;
        for (const p of particles) {
          const n = vecNormalize({ x: this.x - p.x, y: this.y - p.y });
          p.addSpeed(n.x * this.gravity, n.y * this.gravity);
        }

        this.easeRadius = (this.easeRadius + (this.radius - this.currentRadius) * 0.07) * 0.95;
        this.currentRadius += this.easeRadius;
        if (this.currentRadius < 0) this.currentRadius = 0;

        if (this.collapsing) {
          this.radius *= 0.75;
          if (this.currentRadius < 1) this.destroyed = true;
          return;
        }

        const area = this.radius * this.radius * Math.PI;
        for (const g of gravities) {
          if (g === this || g.destroyed) continue;

          if (
            (this.currentRadius >= g.radius || this.dragging) &&
            Math.hypot(this.x - g.x, this.y - g.y) < (this.currentRadius + g.radius) * 0.85
          ) {
            g.destroyed = true;
            this.gravity += g.gravity;
            // Nyerap sedikit momentum ke arah titik yang diserap (absorp), persis source.
            const dist = Math.hypot(g.x - this.x, g.y - this.y) || 1;
            const scale = (g.radius / this.radius) * 0.5;
            this.addSpeed(((g.x - this.x) / dist) * dist * scale, ((g.y - this.y) / dist) * dist * scale);
            const garea = g.radius * g.radius * Math.PI;
            this.currentRadius = Math.sqrt((area + garea * 3) / Math.PI);
            this.radius = Math.sqrt((area + garea) / Math.PI);
          }

          // Titik gravitasi SALING NARIK -- yang lebih gede (gravity field lebih kuat
          // karena udah nyerap titik lain) narik yang lebih kecil ke arahnya. Titik yang
          // lagi di-drag user gak boleh ke-drag balik oleh titik lain (biar responsif).
          if (!g.dragging) {
            const n = vecNormalize({ x: this.x - g.x, y: this.y - g.y });
            g.addSpeed(n.x * this.gravity, n.y * this.gravity);
          }
        }

        if (this.currentRadius > collapseLimit) this.collapse();

        if (!this.dragging) {
          this.x += this.vx;
          this.y += this.vy;
        }
        this.vx = 0;
        this.vy = 0;
      }
      draw(c: CanvasRenderingContext2D) {
        if (this.destroyed) return;
        c.save();
        const outer = c.createRadialGradient(this.x, this.y, this.radius, this.x, this.y, this.radius * 5);
        outer.addColorStop(0, "rgba(0,0,0,0.12)");
        outer.addColorStop(1, "rgba(0,0,0,0)");
        c.beginPath();
        c.arc(this.x, this.y, this.radius * 5, 0, Math.PI * 2);
        c.fillStyle = outer;
        c.fill();

        const r = Math.random() * this.currentRadius * 0.7 + this.currentRadius * 0.3;
        const inner = c.createRadialGradient(this.x, this.y, r, this.x, this.y, this.currentRadius);
        inner.addColorStop(0, "rgba(0,0,0,0.9)");
        inner.addColorStop(1, Math.random() < 0.2 ? `${accentColor}44` : `${glowColor}c0`);
        c.beginPath();
        c.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        c.fillStyle = inner;
        c.fill();
        c.restore();
      }
    }

    const particles = Array.from(
      { length: particleCount },
      () => new Particle(Math.random() * width, Math.random() * height),
    );
    let gravities: GravityPoint[] = [];
    let draggingPoint: GravityPoint | null = null;

    function relativeCoords(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    // mousedown di atas titik yang UDAH ADA -> mulai drag titik itu (bukan bikin baru).
    // mousedown di tempat kosong -> bikin titik gravitasi baru di situ, sama kayak source.
    function handleMouseDown(e: MouseEvent) {
      const { x, y } = relativeCoords(e);
      if (x < 0 || y < 0 || x > width || y > height) return;
      for (let i = gravities.length - 1; i >= 0; i--) {
        if (gravities[i].hitTest(x, y)) {
          gravities[i].startDrag(x, y);
          draggingPoint = gravities[i];
          return;
        }
      }
      gravities.push(new GravityPoint(x, y, initialGravityRadius));
    }
    function handleMouseMove(e: MouseEvent) {
      if (!draggingPoint) return;
      const { x, y } = relativeCoords(e);
      draggingPoint.drag(x, y);
    }
    function handleMouseUp() {
      if (draggingPoint) {
        draggingPoint.endDrag();
        draggingPoint = null;
      }
    }
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    let rafId: number;
    function tick() {
      ctx!.clearRect(0, 0, width, height);

      for (const g of gravities) g.step(particles, gravities);
      gravities = gravities.filter((g) => !g.destroyed);
      for (const g of gravities) g.draw(ctx!);

      // Trail comet: buffer di-fade dikit tiap frame (destination-out), garis baru
      // digambar di atasnya, baru buffer di-composite ke canvas utama yang transparan.
      bufferCtx.save();
      bufferCtx.globalCompositeOperation = "destination-out";
      bufferCtx.globalAlpha = 0.35;
      bufferCtx.fillRect(0, 0, width, height);
      bufferCtx.restore();

      bufferCtx.save();
      bufferCtx.fillStyle = bufferCtx.strokeStyle = "#ffffff";
      bufferCtx.lineCap = bufferCtx.lineJoin = "round";
      bufferCtx.lineWidth = particleRadius * 2;
      bufferCtx.beginPath();
      for (const p of particles) {
        p.update();
        bufferCtx.moveTo(p.x, p.y);
        bufferCtx.lineTo(p.lastX, p.lastY);
      }
      bufferCtx.stroke();
      bufferCtx.beginPath();
      for (const p of particles) {
        bufferCtx.moveTo(p.x, p.y);
        bufferCtx.arc(p.x, p.y, particleRadius, 0, Math.PI * 2);
      }
      bufferCtx.fill();
      bufferCtx.restore();

      ctx!.drawImage(buffer, 0, 0);

      rafId = requestAnimationFrame(tick);
    }
    tick();

    function handleResize() {
      if (!canvas) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
      buffer.width = width;
      buffer.height = height;
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sengaja cuma re-init pas warna berubah
  }, [colors.join(",")]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />;
}
