// Skrip diagnostik SEKALI PAKAI -- bukan bagian dari fitur, buat troubleshoot deteksi
// YouTube Live dari IP server tertentu (yang kadang kena blokir anti-bot YouTube, lihat
// lib/youtube-live.ts). Jalanin di server yang mau ditroubleshoot (bukan cuma lokal),
// soalnya hasilnya beda-beda tergantung IP:
//   npm run yt:check -- <channel-url-atau-handle> [--video <videoId>]
//
// Plain JS (bukan .ts) SENGAJA -- image production (lihat Dockerfile, stage "runner")
// cuma bawa .next/standalone + static + public, gak ada node_modules/tsx/scripts. File
// ini jalan pakai `node` polos yang emang udah ada di container itu, jadi bisa langsung
// disalin & dites di VPS lewat:
//   docker cp scripts/check-youtube-live.mjs kurohiko:/tmp/check-youtube-live.mjs
//   docker exec kurohiko node /tmp/check-youtube-live.mjs <channel-url> [--video <id>]
//
// Nyoba beberapa strategi satu-satu (scraping HTML dua varian + beberapa client
// Innertube API yang beda), print sinyal MENTAH tiap strategi -- biar kebaca strategi
// mana yang masih dikasih data lengkap dari IP ini, dibandingin manual sama status live
// channel yang sebenernya (jalanin skrip ini pas lagi live, pas lagi scheduled, DAN pas
// lagi offline, tiga-tiganya, baru bisa disimpulin strategi mana yang reliable).

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const TIMEOUT_MS = 10_000;

function toLiveUrl(input) {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://www.youtube.com/${url.replace(/^\/+/, "")}`;
  url = url.replace(/\/+$/, "");
  if (!/\/(live|watch)/.test(url)) url += "/live";
  return url;
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  return res.text();
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function checkHtmlStrategies(channelUrl, forcedVideoId) {
  const base = toLiveUrl(channelUrl);
  const url = base + (base.includes("?") ? "&" : "?") + "hl=en&gl=US";
  const html = await fetchText(url);
  console.log(`fetched ${url} -> ${html.length} bytes`);

  const strict = /"liveBroadcastDetails":\{"isLiveNow":(true|false)/.exec(html)?.[1];
  const looseIsLive = /"isLive":true/.test(html);
  const looseUpcoming = /"isUpcoming":true/.test(html);
  console.log(
    `[strategi 1: HTML liveBroadcastDetails] ${strict === undefined ? "TIDAK ADA di HTML" : `isLiveNow=${strict}`}`,
  );
  console.log(
    `[strategi 2: HTML isLive+isUpcoming (fallback lama)] isLive=${looseIsLive} isUpcoming=${looseUpcoming} -> kesimpulan: ${looseIsLive && !looseUpcoming}`,
  );

  const videoId = forcedVideoId ?? /"videoId":"([a-zA-Z0-9_-]{11})"/.exec(html)?.[1];
  const key = /"INNERTUBE_API_KEY":"([^"]+)"/.exec(html)?.[1];
  const clientVersion = /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(html)?.[1];
  console.log(`videoId dipakai buat tes Innertube: ${videoId ?? "(gak ketemu)"}`);
  console.log(`INNERTUBE_API_KEY: ${key ? "ketemu" : "gak ketemu"} | clientVersion: ${clientVersion ?? "(gak ketemu)"}`);

  return { videoId, key, clientVersion };
}

// WEB client key publik, sama yang dipakai yt-dlp -- fallback kalau gak kepetik dari HTML.
// Boleh basi/berubah kapan aja, YouTube gak janjiin stabil, cuma buat troubleshooting.
const FALLBACK_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

function clients(clientVersion) {
  return [
    { name: "WEB", body: { client: { clientName: "WEB", clientVersion } } },
    {
      name: "WEB_EMBEDDED_PLAYER",
      body: {
        client: { clientName: "WEB_EMBEDDED_PLAYER", clientVersion: "1.20260925.01.00" },
        thirdParty: { embedUrl: "https://www.youtube.com" },
      },
    },
    {
      name: "ANDROID",
      body: { client: { clientName: "ANDROID", clientVersion: "19.29.37", androidSdkVersion: 30 } },
    },
    { name: "IOS", body: { client: { clientName: "IOS", clientVersion: "19.29.1" } } },
    {
      name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      body: {
        client: { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0" },
        thirdParty: { embedUrl: "https://www.youtube.com" },
      },
    },
  ];
}

async function checkInnertube(videoId, key, clientVersion) {
  for (const c of clients(clientVersion)) {
    try {
      const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${key}`, {
        method: "POST",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "Content-Type": "application/json", "User-Agent": UA },
        body: JSON.stringify({ videoId, context: c.body }),
      });
      const json = await res.json();
      const status = json?.playabilityStatus?.status;
      const reason = json?.playabilityStatus?.reason;
      const blocked = status && status !== "OK";
      const signal = blocked
        ? ""
        : ` isLive=${json?.videoDetails?.isLive} isLiveContent=${json?.videoDetails?.isLiveContent}` +
          ` liveBroadcastDetails=${JSON.stringify(json?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails)}`;
      console.log(
        `[Innertube ${c.name}] http=${res.status} playability=${status ?? "?"}${reason ? ` ("${reason}")` : ""}${signal}`,
      );
    } catch (e) {
      console.log(`[Innertube ${c.name}] ERROR: ${e.message}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const channelArg = args.find((a) => !a.startsWith("--"));
  const videoFlagIdx = args.indexOf("--video");
  const forcedVideoId = videoFlagIdx !== -1 ? args[videoFlagIdx + 1] : undefined;

  if (!channelArg) {
    console.error("Usage: node check-youtube-live.mjs <channel-url-atau-handle> [--video <videoId>]");
    process.exit(1);
  }

  section("Strategi berbasis scraping HTML");
  const { videoId, key, clientVersion } = await checkHtmlStrategies(channelArg, forcedVideoId);

  if (!videoId) {
    console.log("\nGak ada videoId buat lanjut ke tes Innertube API, berhenti di sini.");
    return;
  }

  section("Strategi berbasis Innertube API (beberapa client)");
  await checkInnertube(videoId, key ?? FALLBACK_KEY, clientVersion ?? "2.20260101.00.00");

  console.log(
    "\nSelesai. Bandingin baris di atas sama status live channel yang SEBENERNYA " +
      "(live/scheduled/offline) pas skrip ini dijalanin -- ulangi di 3 kondisi itu " +
      "sebelum nyimpulin strategi mana yang reliable.",
  );
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
