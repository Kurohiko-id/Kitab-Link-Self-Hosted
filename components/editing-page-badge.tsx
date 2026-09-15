// Pengganti header generik "Judul Tab + Halo, email — page aktif: /slug" yang isinya
// teks gak penting -- cuma nunjukin konteks page yang lagi diedit, sesuai gaya yang
// udah dipakai di tab Overview & Links (gak ada tulisan berlebihan).
export function EditingPageBadge({ slug, label }: { slug: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-accent py-1.5 pr-3 pl-1.5 text-sm">
      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
        /
      </span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-accent-foreground">/{slug}</span>
    </div>
  );
}
