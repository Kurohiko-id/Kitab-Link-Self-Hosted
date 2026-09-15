"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

// Facade thumbnail+play-button -- iframe YouTube ASLI (dengan avatar/share/watch-later/
// "Watch on YouTube" bawaannya) baru dimuat SETELAH user klik play. Sebelum diklik, gak
// ada elemen YouTube apapun yang nempel (cuma thumbnail statis kita sendiri) -- ini BUKAN
// cara nyembunyiin branding YouTube (itu dilarang Terms of Service mereka buat embedded
// player), cuma nunda pemuatan player asli sampai user beneran mau nonton. Bonus: halaman
// publik jadi lebih ringan (gak ada iframe YouTube nempel sebelum diklik).
export function YoutubeFacade({
  videoId,
  title,
  className,
  style,
}: {
  videoId: string;
  title: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={cn("aspect-video w-full overflow-hidden", className)} style={style}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3`}
          title={title}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={cn("group relative block aspect-video w-full overflow-hidden", className)}
      style={style}
      aria-label={title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail dari YouTube langsung (img.youtube.com), bukan aset lokal */}
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        className="size-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/35">
        <span className="flex size-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
          <Play className="size-6 translate-x-0.5" fill="currentColor" strokeWidth={0} />
        </span>
      </span>
      {title ? (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-left text-sm font-medium text-white">
          {title}
        </span>
      ) : null}
    </button>
  );
}
