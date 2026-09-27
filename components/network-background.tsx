"use client";

import { useEffect, useRef } from "react";

// Efek "constellation/plexus" a la particles.js/Particleground -- titik bergerak, garis
// muncul antar titik yang deket. Diperluas dari versi awal biar lebih deket ke config asli
// particles.js (number scaled ke luas kanvas, line_linked distance ~150, move keluar
// sisi -> muncul lagi sisi seberang alias "out_mode: out") + interaksi dari DUA plugin
// sumbernya: particles.js (hover "grab" = garis nyala ke kursor, click "push" = nambah
// partikel di titik klik) DAN Particleground (parallax "3D" -- tiap titik punya `layer`
// 1-3, makin jauh dari layer 1 makin gede geser ngikutin posisi kursor secara halus/eased,
// bikin ilusi kedalaman). Listener mouse dipasang ke `window`, canvas tetap
// pointer-events:none, biar klik ke link/tombol tetap tembus. Murni Canvas API +
// requestAnimationFrame, gak ada library tambahan. Cuma dipakai di preview besar &
// halaman publik (bukan tiap thumbnail gallery, biar gak berat).
export function NetworkBackground({ colors }: { colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dotColor = colors[1] ?? "#22d3ee";
    const accentColor = colors[2] ?? dotColor;
    const linkDistance = 150;
    const grabDistance = 140;
    const densityArea = 9000; // px^2 per particle -- makin kecil makin rame
    const maxParticles = 500;
    const parallaxMultiplier = 14; // makin kecil makin ekstrem gesernya (niru default Particleground)

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    function targetCount() {
      return Math.max(24, Math.min(maxParticles, Math.round((width * height) / densityArea)));
    }

    function makeParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        accent: Math.random() < 0.08,
        layer: 1 + Math.floor(Math.random() * 3), // 1..3 -- lihat parallax di tick()
        offX: 0,
        offY: 0,
      };
    }

    let particles = Array.from({ length: targetCount() }, makeParticle);
    let pointer: { x: number; y: number } | null = null;

    function handleMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointer = x >= 0 && y >= 0 && x <= width && y <= height ? { x, y } : null;
    }
    function handleClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > width || y > height) return;
      for (let i = 0; i < 4 && particles.length < maxParticles; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          accent: false,
          layer: 1 + Math.floor(Math.random() * 3),
          offX: 0,
          offY: 0,
        });
      }
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("click", handleClick);

    let rafId: number;
    function tick() {
      ctx!.clearRect(0, 0, width, height);

      // Target parallax dari posisi kursor relatif ke tengah kanvas -- dibagi
      // (multiplier * layer), jadi particle layer 1 geser paling jauh, layer 3 paling
      // dikit. offX/offY di-ease (bukan langsung loncat) biar gerakannya halus.
      const targX = pointer ? pointer.x - width / 2 : 0;
      const targY = pointer ? pointer.y - height / 2 : 0;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // out_mode "out" -- keluar satu sisi, muncul lagi sisi seberang (bukan mantul)
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.offX += (targX / (parallaxMultiplier * p.layer) - p.offX) / 10;
        p.offY += (targY / (parallaxMultiplier * p.layer) - p.offY) / 10;
      }

      // Jarak buat nyambungin garis dihitung dari posisi FISIK (bukan yang udah digeser
      // parallax) -- biar topologi garis stabil, cuma tampilannya yang "melayang" ngikutin
      // kursor. Titik yang digambar tetap pakai posisi + offset parallax.
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < linkDistance) {
            ctx!.strokeStyle = dotColor;
            ctx!.globalAlpha = 0.4 * (1 - dist / linkDistance);
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x + a.offX, a.y + a.offY);
            ctx!.lineTo(b.x + b.offX, b.y + b.offY);
            ctx!.stroke();
          }
        }
      }

      // "grab": kursor narik garis ke partikel terdekat, lebih terang dari garis biasa
      if (pointer) {
        for (const p of particles) {
          const dist = Math.hypot(p.x - pointer.x, p.y - pointer.y);
          if (dist < grabDistance) {
            ctx!.strokeStyle = accentColor;
            ctx!.globalAlpha = 1 - dist / grabDistance;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(p.x + p.offX, p.y + p.offY);
            ctx!.lineTo(pointer.x, pointer.y);
            ctx!.stroke();
          }
        }
      }

      ctx!.globalAlpha = 1;
      for (const p of particles) {
        ctx!.fillStyle = p.accent ? accentColor : dotColor;
        ctx!.beginPath();
        ctx!.arc(p.x + p.offX, p.y + p.offY, p.accent ? 3 : 2, 0, Math.PI * 2);
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
      const wanted = targetCount();
      if (particles.length < wanted) {
        particles = particles.concat(Array.from({ length: wanted - particles.length }, makeParticle));
      } else if (particles.length > wanted) {
        particles = particles.slice(0, wanted);
      }
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("click", handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sengaja cuma re-init pas warna berubah, bukan tiap render
  }, [colors.join(",")]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />;
}
