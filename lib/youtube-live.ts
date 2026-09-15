const FETCH_TIMEOUT_MS = 10_000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Terima link channel/handle apapun ("https://youtube.com/@nama", "@nama",
// "https://youtube.com/channel/UCxxxx", dst) dan normalisasi ke URL /live-nya.
function toLiveUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://www.youtube.com/${url.replace(/^\/+/, "")}`;
  }
  url = url.replace(/\/+$/, "");
  if (!/\/(live|watch)/.test(url)) url += "/live";
  return url;
}

function extractCanonicalUrl(html: string): string | null {
  const match = /<link rel="canonical" href="([^"]+)"/.exec(html);
  return match?.[1] ?? null;
}

export type YoutubeLiveStatus = { isLive: boolean; videoUrl: string | null };

// Tanpa YouTube Data API: fetch halaman /live milik channel lalu baca
// <link rel="canonical">. Kalau lagi live, YouTube redirect canonical-nya ke
// URL video (/watch?v=...); kalau offline, canonical balik ke halaman channel.
// Return null kalau gagal cek (network error dll) — biar caller gak salah update status.
export async function checkYoutubeLive(channelUrl: string): Promise<YoutubeLiveStatus | null> {
  try {
    const res = await fetch(toLiveUrl(channelUrl), {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": BROWSER_USER_AGENT },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const canonical = extractCanonicalUrl(html);
    if (!canonical || !canonical.includes("/watch")) {
      // Alias /live channel gak ke-redirect ke video manapun -> emang lagi gak ada yang live.
      return { isLive: false, videoUrl: null };
    }

    // Nyampe di halaman /watch (baik lewat redirect alias /live, ATAU input-nya emang
    // langsung link video spesifik) -- canonical-nya SAMA baik pas live maupun udah kelar
    // (video watch URL gak pernah "un-redirect"), jadi gak bisa dipakai buat mastiin status.
    // Signal yang beneran valid: "isLiveNow" di player response, cuma true SELAMA on-air
    // (begitu stream berhenti, YouTube langsung flip ke false meski videonya tetep di /watch).
    const isLiveNow = /"isLiveNow":(true|false)/.exec(html)?.[1] === "true";
    return { isLive: isLiveNow, videoUrl: isLiveNow ? canonical : null };
  } catch {
    return null;
  }
}
