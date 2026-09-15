import { extractYoutubeId } from "@/lib/link-render";

const OG_IMAGE_PATTERNS = [
  /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
];

const FETCH_TIMEOUT_MS = 5000;

async function fetchImageBuffer(imageUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// YouTube nge-deteksi request non-browser (User-Agent generik) dan balikin halaman
// stripped-down TANPA meta og:image sama sekali -- scraping HTML gak reliable buat
// YouTube. Untungnya YouTube punya CDN thumbnail publik yang gak butuh scraping sama
// sekali (sama kayak yang dipake facade embed, lihat components/youtube-facade.tsx).
// maxresdefault gak selalu ada (video lama/resolusi rendah) -> fallback ke hqdefault
// yang dijamin selalu ada buat video valid manapun.
async function fetchYoutubeThumbnail(videoId: string): Promise<Buffer | null> {
  for (const quality of ["maxresdefault", "hqdefault"]) {
    const buffer = await fetchImageBuffer(`https://img.youtube.com/vi/${videoId}/${quality}.jpg`);
    if (buffer) return buffer;
  }
  return null;
}

// Dipanggil pas admin pilih display_style "rich" tanpa thumbnail manual (otomatis),
// ATAU manual lewat tab "Auto" di link-form-modal.tsx -- hasilnya di-cache permanen ke
// links.thumbnailPath.
export async function fetchOgImageBuffer(pageUrl: string): Promise<Buffer | null> {
  const youtubeId = extractYoutubeId(pageUrl);
  if (youtubeId) {
    const thumb = await fetchYoutubeThumbnail(youtubeId);
    if (thumb) return thumb;
  }

  try {
    const pageRes = await fetch(pageUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        // Header selengkap mungkin (bukan cuma User-Agent) -- beberapa situs nge-serve
        // halaman stripped-down (tanpa meta tag) buat request yang keliatan "bukan browser
        // asli" (mis. gak ada Accept/Accept-Language), lihat catatan YouTube di atas.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!pageRes.ok) return null;
    if (!(pageRes.headers.get("content-type") ?? "").includes("text/html")) return null;

    const html = await pageRes.text();
    const match = OG_IMAGE_PATTERNS.map((pattern) => pattern.exec(html)).find(Boolean);
    if (!match) return null;

    const imageUrl = new URL(match[1], pageUrl).toString();
    return await fetchImageBuffer(imageUrl);
  } catch {
    return null;
  }
}
