import { CURRENT_VERSION, isNewerVersion } from "./version";

const GITHUB_REPO = "Kurohiko-id/Kitab-Link-Self-Hosted";

export type LatestRelease = { version: string; name: string; url: string; publishedAt: string };

// In-memory doang, sengaja gak butuh tabel (mirror data publik GitHub, murah di-refetch
// tiap restart) -- ponytail: hilang pas restart, gpp karena cron langsung ngecek ulang.
// Interval cek-nya diatur di instrumentation.ts (cron schedule), bukan di sini.
let cache: LatestRelease | null = null;

export async function checkForUpdates(): Promise<void> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return; // 404 = belum pernah ada rilis, wajar buat repo baru -- diemin aja
    const data = await res.json();
    const version = String(data.tag_name ?? "").replace(/^v/, "");
    if (!version) return;
    cache = { version, name: data.name || data.tag_name, url: data.html_url, publishedAt: data.published_at };
  } catch (err) {
    console.error("[update-check] gagal cek rilis GitHub:", err);
  }
}

// Null kalau belum pernah cek sukses, ATAU rilis terbaru gak lebih baru dari versi
// yang lagi jalan (gak ada apa-apa buat dinotifikasiin).
export function getAvailableUpdate(): LatestRelease | null {
  if (!cache) return null;
  return isNewerVersion(cache.version, CURRENT_VERSION) ? cache : null;
}
