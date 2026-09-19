import { db } from "./db";
import { users } from "./db/schema";
import { CURRENT_VERSION, isNewerVersion } from "./version";

const GITHUB_REPO = "Kurohiko-id/Kitab-Link-Self-Hosted";

export type LatestRelease = { version: string; name: string; url: string; publishedAt: string };

// Disimpen di kolom users.latestReleaseJson (row tunggal, app ini single-user), BUKAN
// variable module-level -- lihat komentar di lib/db/schema.ts kenapa cache in-memory gak
// reliable dibaca lintas Server Component/instrumentation di build standalone Next.js.
export async function checkForUpdates(): Promise<void> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) {
      console.error(`[update-check] GitHub API balas status ${res.status}, dilewati`);
      return;
    }
    const data = await res.json();
    const version = String(data.tag_name ?? "").replace(/^v/, "");
    if (!version) return;
    const release: LatestRelease = { version, name: data.name || data.tag_name, url: data.html_url, publishedAt: data.published_at };
    await db.update(users).set({ latestReleaseJson: JSON.stringify(release) });
  } catch (err) {
    console.error("[update-check] gagal cek rilis GitHub:", err);
  }
}

// Null kalau belum pernah cek sukses, ATAU rilis terbaru gak lebih baru dari versi
// yang lagi jalan (gak ada apa-apa buat dinotifikasiin).
export async function getAvailableUpdate(): Promise<LatestRelease | null> {
  const [row] = await db.select({ latestReleaseJson: users.latestReleaseJson }).from(users).limit(1);
  if (!row?.latestReleaseJson) return null;
  let release: LatestRelease;
  try {
    release = JSON.parse(row.latestReleaseJson);
  } catch {
    return null;
  }
  return isNewerVersion(release.version, CURRENT_VERSION) ? release : null;
}
