"use client";

import { useEffect, useRef } from "react";

// Efek "constellation/plexus" — titik bergerak, garis muncul antar titik yang deket.
// Murni Canvas API + requestAnimationFrame, gak ada library tambahan. Cuma dipakai di
// preview besar & halaman publik (bukan tiap thumbnail gallery, biar gak berat).
export function NetworkBackground({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dotColor = colors[1] ?? "#22d3ee";
    const accentColor = colors[2] ?? dotColor;
    const linkDistance = 140;
    const particleCount = 45;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      accent: Math.random() < 0.08,
    }));

    let rafId: number;
    function tick() {
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= width) p.vx *= -1;
        if (p.y <= 0 || p.y >= height) p.vy *= -1;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < linkDistance) {
            ctx!.strokeStyle = dotColor;
            ctx!.globalAlpha = 1 - dist / linkDistance;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      ctx!.globalAlpha = 1;
      for (const p of particles) {
        ctx!.fillStyle = p.accent ? accentColor : dotColor;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.accent ? 3 : 2, 0, Math.PI * 2);
        ctx!.fill();
      }

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sengaja cuma re-init pas warna berubah, bukan tiap render
  }, [colors.join(",")]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />;
}
