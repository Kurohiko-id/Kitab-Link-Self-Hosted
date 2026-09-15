import { LinkCard } from "@/components/link-card";
import type { PublicLink } from "@/lib/db/board";
import type { ThemeTokens } from "@/lib/theme";

// Baris tombol bulat icon-only (sosmed dkk) di atas/bawah list link biasa -- link-nya
// sendiri di-set lewat displayStyle "icon" di modal edit link biasa, cuma posisi
// render-nya yang beda (lihat lib/link-render.ts's splitIconLinks).
export function SocialIconRow({ links, theme }: { links: PublicLink[]; theme: ThemeTokens }) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {links.map((link, index) => (
        <LinkCard key={link.id} link={link} theme={theme} index={index} />
      ))}
    </div>
  );
}
