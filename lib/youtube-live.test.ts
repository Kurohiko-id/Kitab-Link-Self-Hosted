// node:test bawaan Node -- zero dependency baru, bukan Jest/Vitest (project ini sengaja
// gak punya test runner berat, lihat CLAUDE.md). Jalanin: npm test
//
// Test lewat public API (checkYoutubeLive), bukan internal (extractPlayerResponse dkk) --
// itu yang beneran jadi kontrak ke caller (live-badge-check.ts, scheduled-rules.ts).
// Mock cuma global fetch, bukan mock library.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { checkYoutubeLive, validateYoutubeApiKey } from "./youtube-live";

function mockFetch(html: string, ok = true) {
  mock.method(globalThis, "fetch", async () => ({ ok, text: async () => html }));
}

function playerResponseHtml(obj: unknown): string {
  return `<html><script>var ytInitialPlayerResponse = ${JSON.stringify(obj)};</script></html>`;
}

test("genuinely live -> isLive true + videoUrl dari videoId", async (t) => {
  t.after(() => mock.restoreAll());
  mockFetch(
    playerResponseHtml({
      videoDetails: { videoId: "SU1xgdSGU7M" },
      microformat: { playerMicroformatRenderer: { liveBroadcastDetails: { isLiveNow: true } } },
    }),
  );
  const status = await checkYoutubeLive("@Kurohiko");
  assert.deepEqual(status, { isLive: true, videoUrl: "https://www.youtube.com/watch?v=SU1xgdSGU7M" });
});

test("scheduled (playabilityStatus LIVE_STREAM_OFFLINE) -> isLive false, BUKAN unknown", async (t) => {
  t.after(() => mock.restoreAll());
  mockFetch(
    playerResponseHtml({
      playabilityStatus: { status: "LIVE_STREAM_OFFLINE", reason: "Premieres in 2 hours" },
      videoDetails: { videoId: "abc", isUpcoming: true },
    }),
  );
  const status = await checkYoutubeLive("@Kurohiko");
  assert.deepEqual(status, { isLive: false, videoUrl: null });
});

test("scheduled (cuma isUpcoming, tanpa LIVE_STREAM_OFFLINE) -> isLive false", async (t) => {
  t.after(() => mock.restoreAll());
  mockFetch(playerResponseHtml({ videoDetails: { videoId: "abc", isUpcoming: true } }));
  const status = await checkYoutubeLive("@Kurohiko");
  assert.deepEqual(status, { isLive: false, videoUrl: null });
});

test("stream udah kelar (isLiveNow:false) -> isLive false", async (t) => {
  t.after(() => mock.restoreAll());
  mockFetch(
    playerResponseHtml({
      videoDetails: { videoId: "abc" },
      microformat: { playerMicroformatRenderer: { liveBroadcastDetails: { isLiveNow: false } } },
    }),
  );
  const status = await checkYoutubeLive("@Kurohiko");
  assert.deepEqual(status, { isLive: false, videoUrl: null });
});

test("gak ketuker sinyal isLive:true punya konten LAIN di objek yang sama", async (t) => {
  t.after(() => mock.restoreAll());
  mockFetch(
    playerResponseHtml({
      videoDetails: { videoId: "aaaaaaaaaaa", isLive: false },
      microformat: { playerMicroformatRenderer: { liveBroadcastDetails: { isLiveNow: false } } },
      relatedStuffThatMentions: { isLive: true, videoId: "bbbbbbbbbbb" },
    }),
  );
  const status = await checkYoutubeLive("@Kurohiko");
  assert.deepEqual(status, { isLive: false, videoUrl: null });
});

test("varian HTML kena blokir anti-bot YouTube (LOGIN_REQUIRED, gak ada videoDetails) -> null (unknown), BUKAN dipaksa false", async (t) => {
  t.after(() => mock.restoreAll());
  mockFetch(
    playerResponseHtml({
      playabilityStatus: { status: "LOGIN_REQUIRED", reason: "Sign in to confirm you're not a bot" },
    }),
  );
  const status = await checkYoutubeLive("@Kurohiko");
  assert.equal(status, null);
});

test("ytInitialPlayerResponse gak ada sama sekali di HTML -> null (unknown)", async (t) => {
  t.after(() => mock.restoreAll());
  mockFetch("<html>halaman kosong, gak ada player response</html>");
  const status = await checkYoutubeLive("@Kurohiko");
  assert.equal(status, null);
});

test("HTTP gak ok -> null", async (t) => {
  t.after(() => mock.restoreAll());
  mockFetch("apapun", false);
  const status = await checkYoutubeLive("@Kurohiko");
  assert.equal(status, null);
});

test("fetch throw (network error) -> null, bukan crash", async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(globalThis, "fetch", async () => {
    throw new Error("network down");
  });
  const status = await checkYoutubeLive("@Kurohiko");
  assert.equal(status, null);
});

// ─── Jalur YouTube Data API (apiKey diisi) ──────────────────────────────────────────────
const CHANNEL_ID = `UC${"a".repeat(22)}`;

// Mock per endpoint (nama path terakhir: channels / playlistItems / videos), nyatet URL
// yang dipanggil biar bisa dicek parameter-nya.
function mockApi(routes: Record<string, { ok?: boolean; body: unknown }>) {
  const calls: URL[] = [];
  mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(String(input));
    calls.push(url);
    const route = routes[url.pathname.split("/").pop() ?? ""];
    const ok = route?.ok ?? true;
    return { ok, status: ok ? 200 : 403, json: async () => route?.body ?? {} };
  });
  return calls;
}

test("API: salah satu upload lagi live -> isLive true, videoUrl video yang live", async (t) => {
  t.after(() => mock.restoreAll());
  const calls = mockApi({
    channels: { body: { items: [{ id: CHANNEL_ID }] } },
    playlistItems: { body: { items: [{ contentDetails: { videoId: "sched111111" } }, { contentDetails: { videoId: "live2222222" } }] } },
    videos: {
      body: {
        items: [
          { id: "sched111111", snippet: { liveBroadcastContent: "upcoming" } },
          { id: "live2222222", snippet: { liveBroadcastContent: "live" } },
        ],
      },
    },
  });
  const status = await checkYoutubeLive("https://www.youtube.com/@ApiLiveTest", "AIzaTEST");
  assert.deepEqual(status, { isLive: true, videoUrl: "https://www.youtube.com/watch?v=live2222222" });
  assert.equal(calls[0].searchParams.get("forHandle"), "@ApiLiveTest");
  assert.equal(calls[1].searchParams.get("playlistId"), `UU${"a".repeat(22)}`);
});

test("API: cuma ada yang scheduled (upcoming) -> isLive false", async (t) => {
  t.after(() => mock.restoreAll());
  mockApi({
    playlistItems: { body: { items: [{ contentDetails: { videoId: "sched111111" } }] } },
    videos: { body: { items: [{ id: "sched111111", snippet: { liveBroadcastContent: "upcoming" } }] } },
  });
  const status = await checkYoutubeLive(`https://www.youtube.com/channel/${CHANNEL_ID}`, "AIzaTEST");
  assert.deepEqual(status, { isLive: false, videoUrl: null });
});

test("API: error dari Google (mis. kuota abis) -> null, BUKAN dipaksa false", async (t) => {
  t.after(() => mock.restoreAll());
  mock.method(console, "warn", () => {});
  mockApi({ playlistItems: { ok: false, body: { error: { message: "quotaExceeded" } } } });
  const status = await checkYoutubeLive(`https://www.youtube.com/channel/${CHANNEL_ID}`, "AIzaTEST");
  assert.equal(status, null);
});

test("validateYoutubeApiKey: key valid -> null, key ditolak -> pesan error Google", async (t) => {
  t.after(() => mock.restoreAll());
  mockApi({ videos: { body: { items: [] } } });
  assert.equal(await validateYoutubeApiKey("AIzaGOOD"), null);
  mock.restoreAll();
  mockApi({ videos: { ok: false, body: { error: { message: "API key not valid." } } } });
  assert.equal(await validateYoutubeApiKey("AIzaBAD"), "API key not valid.");
});
