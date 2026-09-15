import { getPublicDictionary, type PublicLocale } from "@/lib/public-i18n";

// Badge "sedang live" di paling atas halaman publik -- klik langsung ke video live-nya
// (bukan ke halaman channel). Pulse pake Tailwind bawaan (animate-ping), gak perlu
// keyframe custom. Server Component murni, nol client JS. Layout dua elemen (info live di
// kiri + aksi "Tonton" di kanan).
//
// Translucent + border, warna merah HARDCODE (bukan token theme) -- ini permintaan desain
// eksplisit, dicontek dari mockup asli. Sempat diganti solid gara-gara `dark:` variant yang
// dipasang sebelumnya salah alat (dark: itu ngikut dark-mode DASHBOARD, bukan gelap-terangnya
// theme halaman publik) -- fix-nya bukan "jadi solid", tapi buang dark:-nya. Trade-off yang
// tetep ada, dan disadari: di theme publik yang BACKGROUND-nya sangat gelap (mis. Neon
// Cyberpunk, Deep Ocean Solid), badge merah translucent + teks merah tua ini kontrasnya bisa
// lebih rendah dibanding versi solid putih-di-atas-merah. Diterima sebagai trade-off demi
// konsistensi visual sama mockup.
export function LiveBadge({ name, videoUrl, locale }: { name: string; videoUrl: string; locale: PublicLocale }) {
  const t = getPublicDictionary(locale);
  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition-transform hover:scale-[1.02]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-600 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-red-600" />
        </span>
        <span className="truncate">{t.isLiveNow(name)}</span>
      </span>
      <span className="shrink-0 text-xs underline">{t.watchNow}</span>
    </a>
  );
}
