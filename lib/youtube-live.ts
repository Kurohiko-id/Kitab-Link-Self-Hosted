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
  // "undefined" di sini (bukan URL asli, bukan kosong) -- treat itu sebagai "gak ada".
  return href && href !== "undefined" ? href : null;
}

// Last-resort banget kalau parsing JSON di bawah gagal total -- lebih longgar (nangkep
// videoId PERTAMA di mana pun di HTML, gak scoped ke video/channel yang diminta), makanya
// cuma dipanggil kalau extractPlayerResponse() gak ketemu apa-apa sama sekali.
function extractVideoId(html: string): string | null {
  return /"videoId":"([a-zA-Z0-9_-]{11})"/.exec(html)?.[1] ?? null;
}

// Ambil objek `ytInitialPlayerResponse` dari HTML dengan bener-bener parse brace demi
// brace (hormatin isi string biar kurung kurawal di dalam teks gak keitung) terus
// JSON.parse -- BUKAN regex nyomot field satu-satu. Field kayak "isLive"/"isUpcoming" bisa
// muncul di BANYAK tempat di halaman (widget viewCount punya sendiri, video rekomendasi di
// sidebar punya sendiri) -- regex on nangkep kejadian PERTAMA di seluruh HTML, gak peduli
// itu punya video yang diminta atau bukan. Verified manual 2026-09-27: videoId yang
// kepetik regex 2x kejadian ternyata punya LIVE STREAM CHANNEL LAIN yang lagi
// direkomendasiin di halaman, bukan punya channel yang dicek -- itu bug beneran, bukan
// cuma "kadang salah baca scheduled", jadi regex per-field udah gak bisa dipercaya sama
// sekali. Parse objeknya utuh -- semua field di dalamnya dijamin scoped ke video yang
// sama.
function extractPlayerResponse(html: string): Record<string, unknown> | null {
  const marker = /ytInitialPlayerResponse\s*=/.exec(html);
  if (!marker) return null;

  const start = html.indexOf("{", marker.index + marker[0].length);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

type Verdict = "live" | "offline" | "unknown";

// Baca videoDetails/microformat/playabilityStatus dari player response yang UDAH di-parse
// (bukan regex lepas) buat mutusin status live-nya. "unknown" -- bukan "offline" -- kalau
// gak ketemu bukti apa pun; caller treat "unknown" sama kayak gagal network (diemin, jangan
// update apapun), BUKAN dipaksa jadi false. Ini beda sama versi sebelumnya yang maksa false
// kalau field presisi gak ketemu -- di IP yang kena varian HTML kosongan (lihat komentar di
// checkYoutubeLive), itu bikin badge yang lagi BENERAN LIVE ke-matiin sendiri.
function judgeLiveStatus(html: string): { verdict: Verdict; videoId: string | null } {
  const pr = extractPlayerResponse(html);
  if (!pr) return { verdict: "unknown", videoId: null };

  const videoDetails = (pr.videoDetails ?? {}) as Record<string, unknown>;
  const microformat = (
    (pr.microformat as Record<string, unknown> | undefined)?.playerMicroformatRenderer ?? {}
  ) as Record<string, unknown>;
  const liveBroadcastDetails = (microformat.liveBroadcastDetails ?? videoDetails.liveBroadcastDetails ?? null) as {
    isLiveNow?: boolean;
  } | null;
  const videoId = typeof videoDetails.videoId === "string" ? videoDetails.videoId : null;
  const playabilityStatus = (pr.playabilityStatus as Record<string, unknown> | undefined)?.status;

  // Dua sinyal independen buat "masih scheduled, belum mulai" -- keduanya lebih spesifik
  // daripada isUpcoming doang, tolak duluan sebelum sempet ketuker sama isLiveNow.
  if (playabilityStatus === "LIVE_STREAM_OFFLINE") return { verdict: "offline", videoId };
  if (videoDetails.isUpcoming === true || microformat.isUpcoming === true) return { verdict: "offline", videoId };

  if (liveBroadcastDetails?.isLiveNow === true) return { verdict: "live", videoId };
  if (liveBroadcastDetails?.isLiveNow === false) return { verdict: "offline", videoId };

  return { verdict: "unknown", videoId };
}

export type YoutubeLiveStatus = { isLive: boolean; videoUrl: string | null };

// ─── Jalur YouTube Data API (opsional, kalau user ngisi API key di dashboard) ─────────────
// Scraping di bawah BISA keblokir total dari IP datacenter/VPS -- verified 2026-09-27,
// playabilityStatus-nya sendiri bilang "LOGIN_REQUIRED: Sign in to confirm you're not a
// bot", termasuk lewat Innertube API. API resmi gak kena itu. Sengaja GAK pakai
// search.list?eventType=live (100 unit kuota/panggilan) -- 3 panggilan murah ini cuma
// ~2 unit per cek (channel ID di-cache), cron tiap 2 menit x 2 fitur (live badge + auto
// show) ~2.900 unit/hari dari kuota gratis 10.000.
const API_BASE = "https://www.googleapis.com/youtube/v3";

type ChannelRef = { channelId: string } | { handle: string } | { username: string };

function parseChannelRef(input: string): ChannelRef | null {
  const s = input.trim();
  const id = /(?:^|\/channel\/)(UC[\w-]{22})(?:[/?#]|$)/.exec(s)?.[1];
  if (id) return { channelId: id };
  const handle = /(?:^|youtube\.com\/)@([\w.-]+)/.exec(s)?.[1];
  if (handle) return { handle };
  const username = /youtube\.com\/user\/([\w.-]+)/.exec(s)?.[1];
  if (username) return { username };
  return null;
}

async function apiGet(path: string, params: Record<string, string>, apiKey: string) {
  const url = `${API_BASE}/${path}?${new URLSearchParams({ ...params, key: apiKey })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    // Ke `docker logs` -- biar kelihatan KENAPA gagal (key salah, API belum di-enable,
    // kuota abis), bukan cuma status diem gak update.
    console.warn(`[youtube-api] ${path} gagal (${res.status}): ${json?.error?.message ?? "unknown error"}`);
    return null;
  }
  return json;
}

// ponytail: cache per-proses (bisa beda instance antara cron & tombol refresh, lihat
// komentar latestReleaseJson di schema.ts) -- miss cuma nambah 1 unit kuota, bukan salah.
const channelIdCache = new Map<string, string>();

async function resolveChannelId(channelUrl: string, apiKey: string): Promise<string | null> {
  const cached = channelIdCache.get(channelUrl);
  if (cached) return cached;
  const ref = parseChannelRef(channelUrl);
  if (!ref) return null;
  let channelId: string | null = null;
  if ("channelId" in ref) channelId = ref.channelId;
  else {
    const params: Record<string, string> =
      "handle" in ref ? { part: "id", forHandle: `@${ref.handle}` } : { part: "id", forUsername: ref.username };
    const json = await apiGet("channels", params, apiKey);
    channelId = json?.items?.[0]?.id ?? null;
  }
  if (channelId) channelIdCache.set(channelUrl, channelId);
  return channelId;
}

async function checkYoutubeLiveViaApi(channelUrl: string, apiKey: string): Promise<YoutubeLiveStatus | null> {
  const channelId = await resolveChannelId(channelUrl, apiKey);
  if (!channelId) return null;

  // Playlist "uploads" channel = "UU" + channel ID tanpa "UC" -- isinya SEMUA video publik
  // (termasuk yang lagi live, scheduled, shorts live), terbaru di atas. 50 = maksimum
  // per panggilan, biayanya sama 1 unit kayak 5.
  const uploads = await apiGet(
    "playlistItems",
    { part: "contentDetails", playlistId: `UU${channelId.slice(2)}`, maxResults: "50", fields: "items/contentDetails/videoId" },
    apiKey,
  );
  if (!uploads) return null;
  const ids: string[] = (uploads.items ?? []).map((i: { contentDetails?: { videoId?: string } }) => i.contentDetails?.videoId).filter(Boolean);
  if (ids.length === 0) return { isLive: false, videoUrl: null };

  // liveBroadcastContent: "live" (lagi on-air) | "upcoming" (scheduled) | "none" -- field
  // resmi, gak ambigu kayak sinyal HTML. Scheduled otomatis kebaca offline.
  const videos = await apiGet("videos", { part: "snippet", id: ids.join(","), fields: "items(id,snippet/liveBroadcastContent)" }, apiKey);
  if (!videos) return null;
  const live = (videos.items ?? []).find(
    (v: { snippet?: { liveBroadcastContent?: string } }) => v.snippet?.liveBroadcastContent === "live",
  );
  return live ? { isLive: true, videoUrl: `https://www.youtube.com/watch?v=${live.id}` } : { isLive: false, videoUrl: null };
}

// Dipanggil pas user nyimpen API key di dashboard -- tes 1 panggilan (1 unit) biar key
// yang salah/API belum di-enable langsung ketahuan di form, bukan diem-diem gak jalan.
// Return pesan error dari Google, atau null kalau key valid.
export async function validateYoutubeApiKey(apiKey: string): Promise<string | null> {
  try {
    const url = `${API_BASE}/videos?${new URLSearchParams({ part: "id", id: "dQw4w9WgXcQ", key: apiKey })}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.error?.message ?? `HTTP ${res.status}`;
  } catch (e) {
    return (e as Error).message;
  }
}

// Tanpa YouTube Data API: fetch halaman /live milik channel, baca player response-nya buat
// nentuin status live. Return null kalau GAGAL CEK (network error) ATAU HASILNYA GAK YAKIN
// (halaman gak nyisipin ytInitialPlayerResponse sama sekali) -- dua-duanya caller treat
// sama: diemin, coba lagi di poll berikutnya, JANGAN paksa update status.
//
// "Gak yakin" itu kejadian nyata, bukan teori: 2026-09-27, YouTube ngirim varian halaman
// channel yang lebih "kosong" (gak nyisipin videoDetails/player response lengkap) ke IP
// tertentu -- kemungkinan kena flagging anti-bot mereka, independen dari kode ini (Innertube
// API dari IP yang sama juga ditolak "Sign in to confirm you're not a bot"). Belum ada cara
// scraping yang kebukti reliable ngatasin itu -- upgrade ke YouTube Data API resmi (OAuth,
// liveBroadcasts.list mine=true) kalau butuh akurat 100% terlepas dari varian HTML yang
// diterima IP server. ponytail: sampai saat itu, badge/auto-show cuma gak update pas kena
// varian kosong (aman, gak salah nunjukin apa-apa), bukan sok tau nebak status-nya.
//
// `apiKey` diisi -> pakai jalur YouTube Data API di atas (akurat, gak kena blokir IP),
// TANPA fallback ke scraping kalau API gagal (key udah divalidasi pas disimpen, jadi gagal
// di sini = masalah sementara/kuota, alasannya ke-log di docker logs).
export async function checkYoutubeLive(channelUrl: string, apiKey?: string | null): Promise<YoutubeLiveStatus | null> {
  try {
    if (apiKey) return await checkYoutubeLiveViaApi(channelUrl, apiKey);

    const res = await fetch(toLiveUrl(channelUrl), {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": BROWSER_USER_AGENT },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const { verdict, videoId } = judgeLiveStatus(html);
    if (verdict === "unknown") return null;
    if (verdict === "offline") return { isLive: false, videoUrl: null };

    const canonical = extractCanonicalUrl(html);
    const videoUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : canonical?.includes("/watch")
        ? canonical
        : extractVideoId(html)
          ? `https://www.youtube.com/watch?v=${extractVideoId(html)}`
          : null;
    // Live tapi gak ketemu URL video sama sekali -- datanya gak lengkap, aman-nya diemin
    // (null) daripada nge-flag live tanpa videoUrl (badge butuh itu buat link "Tonton").
    if (!videoUrl) return null;
    return { isLive: true, videoUrl };
  } catch {
    return null;
  }
}
