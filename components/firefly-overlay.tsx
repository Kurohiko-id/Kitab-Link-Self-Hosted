import type { TextureParticleDirection } from "@/lib/theme";

// Adaptasi CodePen "CSS Particle Animation" (tonkotsuboy) -- beda dari textureType
// "particle" (box-shadow trick, satu bentuk global buat semua titik), di sini tiap
// kunang-kunang beneran elemen <span> sendiri dengan @keyframes translate3d UNIK per
// elemen (persis pola SCSS `@for` di sumber aslinya), radial-gradient (glow, bukan flat
// dot) + mix-blend-mode:screen biar keliatan nyala nembus gelap, plus animasi scale
// pulse. Murni Server Component (semua random-nya deterministic hash, bukan
// Math.random() literal di render, biar SSR stabil) -- gak butuh "use client" sama
// sekali karena animasinya CSS murni.
// PENTING: integer hash (Math.imul/xor/shift), BUKAN Math.sin -- trig function
// "implementation-approximated" di spec ECMAScript, bisa beda bit terakhir antara
// V8 Node.js (server) vs V8 Chrome (client) -> React hydration mismatch (pernah
// ke-trigger beneran, lihat commit fix-nya). Integer ops exact & portable, sama
// kayak particleHash() di lib/theme.ts.
function fireflyHash(a: number, b: number): number {
  let x = (Math.imul(a, 2654435761) ^ Math.imul(b, 2246822519)) | 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const DEFAULT_COLORS = ["#5eead4"];
const DEFAULT_DENSITY = 40;

export function FireflyOverlay({
  colors,
  direction,
  density,
  opacity,
}: {
  colors?: string[];
  direction?: TextureParticleDirection;
  density?: number;
  opacity: number;
}) {
  const palette = colors && colors.length > 0 ? colors : DEFAULT_COLORS;
  const count = density && density > 0 ? density : DEFAULT_DENSITY;
  const dir = direction ?? "up";

  const particles = Array.from({ length: count }, (_, i) => {
    const startMain = fireflyHash(i + 1, 1) * 100;
    const endMain = fireflyHash(i + 1, 2) * 100;
    // "cross" = sumbu kecil (goyangan), sengaja beda tipis dari main biar jalurnya
    // gak lurus sempurna -- persis efek acak sumber aslinya.
    const cross = 40 + fireflyHash(i + 1, 3) * 20;
    const size = Number((4 + fireflyHash(i + 1, 4) * 6).toFixed(2));
    const duration = Number((7 + fireflyHash(i + 1, 5) * 4).toFixed(2));
    const delay = Number((fireflyHash(i + 1, 6) * -8).toFixed(2));
    const color = palette[i % palette.length];

    let startX: number, startY: number, endX: number, endY: number;
    switch (dir) {
      case "down":
        startX = cross;
        startY = -10 - startMain * 0.1;
        endX = cross;
        endY = 110 + endMain * 0.1;
        break;
      case "left":
        startX = 110 + startMain * 0.1;
        startY = cross;
        endX = -10 - endMain * 0.1;
        endY = cross;
        break;
      case "right":
        startX = -10 - startMain * 0.1;
        startY = cross;
        endX = 110 + endMain * 0.1;
        endY = cross;
        break;
      case "none":
        startX = startMain;
        startY = cross;
        endX = startMain;
        endY = cross;
        break;
      default: // up
        startX = startMain;
        startY = 110 + startMain * 0.1;
        endX = endMain;
        endY = -10 - endMain * 0.1;
    }

    return { i, startX, startY, endX, endY, size, duration, delay, color };
  });

  return (
    <div
      className="kl-firefly-overlay"
      // fixed (BUKAN absolute) -- overlay ini dipasang di wrapper halaman yang
      // tingginya ngikutin SELURUH konten (bisa jauh lebih tinggi dari 1 layar kalau
      // link-nya banyak), padahal posisi tiap kunang-kunang di-generate pakai vh
      // (relatif ke TINGGI LAYAR). Kalau absolute, translate3d-nya jalan relatif ke
      // wrapper yang tinggi itu -- kunang-kunangnya "ngumpul" di tengah/bawah halaman,
      // gak kelihatan tanpa scroll jauh. Fixed = anchor ke viewport, sesuai asumsi vh.
      style={{ position: "fixed", inset: 0, zIndex: 30, pointerEvents: "none", overflow: "hidden", opacity }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: particles
            .map(
              (p) =>
                `@keyframes kl-firefly-move-${p.i}{from{transform:translate3d(${p.startX.toFixed(1)}vw,${p.startY.toFixed(1)}vh,0)}to{transform:translate3d(${p.endX.toFixed(1)}vw,${p.endY.toFixed(1)}vh,0)}}`,
            )
            .join(""),
        }}
      />
      {particles.map((p) => (
        // Dua level sengaja dipisah kayak sumber aslinya (.circle-container > .circle):
        // luar cuma urus POSISI (translate3d), dalem cuma urus PULSA (scale+opacity) --
        // kalau digabung satu elemen, dua animation yang sama-sama nyentuh `transform`
        // bakal saling timpa (browser gak nge-blend dua transform dari animation beda).
        <span
          key={p.i}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: p.size,
            height: p.size,
            animation: `kl-firefly-move-${p.i} ${p.duration}s linear ${p.delay}s infinite`,
          }}
        >
          <span
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              mixBlendMode: "screen",
              backgroundImage: `radial-gradient(${p.color}, ${p.color} 10%, transparent 56%)`,
              animation: `kl-firefly-pulse 2s ease-in-out ${p.delay}s infinite`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
