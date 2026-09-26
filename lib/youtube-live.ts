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
  const href = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  // Ke-observasi dari VPS tertentu: YouTube kadang beneran ngerender literal string
  // "undefined" di sini (bukan URL asli, bukan kosong) -- kemungkinan flakiness render
  // mereka sendiri, tergantung IP/kondisi request. Treat itu sebagai "gak ada", bukan URL
  // valid -- sebelumnya ini bikin isLive:true asli KEBACA offline gara-gara canonical-nya
  // "rusak" dicek DULUAN sebelum sinyal isLive yang sebenernya udah bener.
  return href && href !== "undefined" ? href : null;
}

// Fallback ambil video ID kalau canonical gak valid/gak ada -- videoId di initial player
// response HAMPIR SELALU ada di HTML /live selama ada konteks video (live).
function extractVideoId(html: string): string | null {
  return /"videoId":"([a-zA-Z0-9_-]{11})"/.exec(html)?.[1] ?? null;
}

export type YoutubeLiveStatus = { isLive: boolean; videoUrl: string | null };

// Tanpa YouTube Data API: fetch halaman /live milik channel, baca videoDetails.isLive di
// player response -- SATU-SATUNYA sinyal yang valid, cuma true SELAMA on-air (begitu stream
// berhenti, YouTube langsung flip ke false meski videonya tetep ada). BUKAN "isLiveNow"
// (field itu gak pernah ada di HTML-nya, verified manual) atau "isLiveContent"/"isLiveVideo"
// dst (flag teknis lain, true juga buat video yang DULU live tapi udah kelar/jadi VOD).
// isLive dicek DULUAN (bukan gate di canonical dulu kayak sebelumnya) -- canonical/videoId
// cuma buat ambil URL video-nya, dan BOLEH gagal/rusak tanpa bikin status-nya salah.
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
    const isLiveNow = /"isLive":(true|false)/.exec(html)?.[1] === "true";
    if (!isLiveNow) return { isLive: false, videoUrl: null };

    const canonical = extractCanonicalUrl(html);
    const videoId = extractVideoId(html);
    const videoUrl = canonical?.includes("/watch") ? canonical : videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
    // isLive true tapi gak ketemu URL video sama sekali (canonical DAN videoId dua-duanya
    // gagal) -- datanya gak lengkap, aman-nya treat sebagai belum ke-detect penuh daripada
    // nge-flag live tanpa videoUrl (badge butuh itu buat link "Tonton").
    if (!videoUrl) return { isLive: false, videoUrl: null };
    return { isLive: true, videoUrl };
  } catch {
    return null;
  }
}
