import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker runner stage cuma butuh copy .next/standalone -- gak perlu bawa node_modules
  // penuh atau source TS-nya.
  output: "standalone",

  // Next.js dev server nge-block request ke aset "/_next/*" (termasuk JS chunk buat
  // hydration komponen client) kalau originnya bukan "localhost" atau hostname yang
  // di-allowlist -- makanya buka lewat IP LAN (dari HP pas testing) bikin HTML/CSS ke-load
  // normal tapi SEMUA komponen "use client" (termasuk widget Discord mode inline) gagal
  // hydrate diem-diem, useEffect-nya gak pernah jalan. Cuma efek dev mode, gak ngaruh ke
  // production (next start / Docker).
  allowedDevOrigins: ["192.168.1.151"],

  // Default Next.js buat body Server Action cuma 1MB -- foto profil/banner asli (dari HP)
  // gampang lebih gede dari itu, request-nya ditolak duluan sebelum sempet ke validasi
  // ukuran kita sendiri (MAX_OG_IMAGE_BYTES dst di settings-actions.ts, sampai 5MB).
  // 8MB kasih headroom buat overhead multipart + upload avatar&banner bareng di 1 form.
  // 20MB karena import theme v2 membawa aset base64 (batas aset 15MB + overhead).
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },

    // Default-nya Next.js nyalain beberapa compile worker PARALEL sebanyak jumlah CPU
    // core yang KEBACA (bukan yang dijatah container) -- di VPS kecil yang jalanin
    // banyak container bareng, tiap worker itu proses Node terpisah (NODE_OPTIONS heap
    // cap di Dockerfile cuma ngiket 1 proses, bukan totalnya), jadi `next build` bisa
    // nyedot RAM jauh lebih banyak dari yang keiket, bikin container tetangga starve.
    // cpus:1 maksa build serial (1 worker doang) -- lebih lambat, tapi puncak RAM-nya
    // predictable & keiket.
    cpus: 1,
  },

  // Migration files (.sql + meta/_journal.json) dibaca via fs.readFileSync di runtime
  // (instrumentation.ts), BUKAN di-import kayak modul JS -- file tracing standalone
  // Next.js gak otomatis nangkep ini, jadi harus dipaksa ikut biar gak ketinggalan
  // pas di-deploy (drizzle-kit sendiri devDependency, gak kebawa ke production install).
  outputFileTracingIncludes: {
    "/": ["./drizzle/**/*"],
  },
};

export default nextConfig;
