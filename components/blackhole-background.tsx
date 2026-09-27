"use client";

import { useEffect, useRef } from "react";

// Sama persis mekanismenya kayak GravityDustBackground (drag, gabung/absorb, saling
// narik antar titik, narik partikel debu) -- BEDANYA cuma di draw(): di sini titiknya
// digambar "stylized" kayak render blackhole ala Interstellar (bukan physically-accurate
// ray-traced gravitational lensing -- itu butuh shader per-pixel, kebanyakan buat
// dekorasi background halaman). Triknya cuma layering Canvas 2D biasa:
//   1. Piringan akresi digambar sebagai ELIPS MIRING (rotate+scale) dengan gradient
//      radial panas-di-tengah -> dingin-di-luar.
//   2. Event horizon (lingkaran hitam pekat) digambar DI ATAS elips itu, pas di tengah --
//      karena elipsnya lebih lebar dari lingkaran hitam, bagian atas & bawah elips
//      "nongol" ngebungkus lingkaran hitam. Itu yang bikin efeknya kayak cahaya
//      dibelokin ngelilingin blackhole, padahal cuma dua lapis gambar biasa.
//   3. Cincin tipis terang (photon ring) di silhouette lingkaran hitam, screen blend.
// Gravity Dust yang lama TETEP ADA & gak diubah -- ini opsi background terpisah.
export function BlackholeBackground({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const hotColor = colors[1] ?? "#fff4d6";
    const midColor = colors[2] ?? "#ff8a3d";
    const dustColor = "#ffffff";
    const particleCount = 90;
    const particleRadius = 1.2;
    const initialRadius = 10;
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
        // Mantul di tepi (bukan teleport) -- lihat catatan di GravityDustBackground soal
        // kenapa teleport bikin glitch garis di trail comet.
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
        this.x = Math.min(Math.max(this.x, 0), width);
        this.y = Math.min(Math.max(this.y, 0), height);
      }
    }

    class Blackhole {
      x: number;
      y: number;
      radius: number;
      currentRadius: number;
      gravity = 0.045;
      destroyed = false;
      collapsing = false;
      dragging = false;
      // Sudut kemiringan piringan akresi, DIACAK SEKALI pas lahir (bukan tiap frame)
      // biar keliatan natural (tiap blackhole beda arah miringnya, kayak referensi foto).
      readonly tilt: number;
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
        this.tilt = (-25 + Math.random() * 10) * (Math.PI / 180);
      }
      addSpeed(dx: number, dy: number) {
        this.vx += dx;
        this.vy += dy;
      }
      hitTest(x: number, y: number) {
        return Math.hypot(this.x - x, this.y - y) < Math.max(this.currentRadius * 2.2, 16);
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
      // Fisika di bawah ini SAMA PERSIS dengan GravityDustBackground -- lihat komentar
      // di sana buat penjelasan lengkap (akumulator per-frame, absorb, saling-tarik).
      step(particles: Particle[], holes: Blackhole[]) {
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
        for (const g of holes) {
          if (g === this || g.destroyed) continue;

          if (
            (this.currentRadius >= g.radius || this.dragging) &&
            Math.hypot(this.x - g.x, this.y - g.y) < (this.currentRadius + g.radius) * 0.85
          ) {
            g.destroyed = true;
            this.gravity += g.gravity;
            const dist = Math.hypot(g.x - this.x, g.y - this.y) || 1;
            const scale = (g.radius / this.radius) * 0.5;
            this.addSpeed(((g.x - this.x) / dist) * dist * scale, ((g.y - this.y) / dist) * dist * scale);
            const garea = g.radius * g.radius * Math.PI;
            this.currentRadius = Math.sqrt((area + garea * 3) / Math.PI);
            this.radius = Math.sqrt((area + garea) / Math.PI);
          }

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
        const r = this.currentRadius;
        c.save();
        c.translate(this.x, this.y);

        // Glow ambient lembut biar nyatu sama scene (sama kayak versi Gravity Dust).
        const outer = c.createRadialGradient(0, 0, r, 0, 0, r * 5);
        outer.addColorStop(0, "rgba(0,0,0,0.15)");
        outer.addColorStop(1, "rgba(0,0,0,0)");
        c.beginPath();
        c.arc(0, 0, r * 5, 0, Math.PI * 2);
        c.fillStyle = outer;
        c.fill();

        // Piringan akresi: elips miring (rotate+scale), gradient radial panas->dingin.
        // Radius luarnya SENGAJA lebih gede dari r, biar pas lingkaran hitam digambar
        // nutupin tengahnya nanti, bagian atas-bawah elips masih "nongol" (itu yang
        // bikin efek kayak cahaya ngebungkus si blackhole).
        c.save();
        c.rotate(this.tilt);
        c.scale(1, 0.3);
        const diskOuter = r * 2.4;
        const disk = c.createRadialGradient(0, 0, r * 0.9, 0, 0, diskOuter);
        disk.addColorStop(0, "rgba(255,255,255,0.95)");
        disk.addColorStop(0.35, `${hotColor}e6`);
        disk.addColorStop(0.7, `${midColor}aa`);
        disk.addColorStop(1, "rgba(90,20,10,0)");
        c.beginPath();
        c.arc(0, 0, diskOuter, 0, Math.PI * 2);
        c.fillStyle = disk;
        c.fill();
        c.restore();

        // Event horizon: lingkaran hitam pekat di tengah, nutupin "badan" elips.
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fillStyle = "#000000";
        c.fill();

        // Photon ring: cincin tipis terang pas di silhouette-nya, screen blend biar nyala.
        c.globalCompositeOperation = "screen";
        const rim = c.createRadialGradient(0, 0, r * 0.88, 0, 0, r * 1.08);
        rim.addColorStop(0, "rgba(255,255,255,0)");
        rim.addColorStop(0.8, "rgba(255,255,255,0)");
        rim.addColorStop(1, "rgba(255,244,214,0.85)");
        c.beginPath();
        c.arc(0, 0, r * 1.08, 0, Math.PI * 2);
        c.fillStyle = rim;
        c.fill();
        c.globalCompositeOperation = "source-over";

        c.restore();
      }
    }

    const particles = Array.from(
      { length: particleCount },
      () => new Particle(Math.random() * width, Math.random() * height),
    );
    let holes: Blackhole[] = [];
    let draggingHole: Blackhole | null = null;

    function relativeCoords(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function handleMouseDown(e: MouseEvent) {
      const { x, y } = relativeCoords(e);
      if (x < 0 || y < 0 || x > width || y > height) return;
      for (let i = holes.length - 1; i >= 0; i--) {
        if (holes[i].hitTest(x, y)) {
          holes[i].startDrag(x, y);
          draggingHole = holes[i];
          return;
        }
      }
      holes.push(new Blackhole(x, y, initialRadius));
    }
    function handleMouseMove(e: MouseEvent) {
      if (!draggingHole) return;
      const { x, y } = relativeCoords(e);
      draggingHole.drag(x, y);
    }
    function handleMouseUp() {
      if (draggingHole) {
        draggingHole.endDrag();
        draggingHole = null;
      }
    }
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    let rafId: number;
    function tick() {
      ctx!.clearRect(0, 0, width, height);

      for (const g of holes) g.step(particles, holes);
      holes = holes.filter((g) => !g.destroyed);
      for (const g of holes) g.draw(ctx!);

      bufferCtx.save();
      bufferCtx.globalCompositeOperation = "destination-out";
      bufferCtx.globalAlpha = 0.35;
      bufferCtx.fillRect(0, 0, width, height);
      bufferCtx.restore();

      bufferCtx.save();
      bufferCtx.fillStyle = bufferCtx.strokeStyle = dustColor;
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
