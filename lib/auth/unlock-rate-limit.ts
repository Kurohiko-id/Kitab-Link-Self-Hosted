// Rate limit percobaan password/TOTP -- in-memory per proses, sengaja gak butuh tabel/Redis
// (skala project ini kecil, lihat CLAUDE.md). Key-nya string berprefix ("page:5", "login:x@y.com",
// "totp:12") biar namespace beda-beda gak collide walau nilai mentahnya sama.
// ponytail: reset kalau server restart, cukup buat nahan brute-force kasar di 1 proses
// yang sama, upgrade ke store persisten kalau nanti jalan multi-instance.
//
// PENTING soal ukuran Map: key di sini WAJIB dari domain terbatas (id numerik page/user) atau
// dibatasi eviction-nya kalau nanti diganti jadi key bebas (IP/email attacker-controlled) --
// tanpa itu Map ini bisa tumbuh gak terbatas (memory leak beneran). cleanupExpired() dipanggil
// tiap recordFailedAttempt buat nyapu entry basi, jadi ukurannya cuma proporsional sama jumlah
// attacker AKTIF dalam WINDOW_MS terakhir, bukan seumur hidup proses.
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000; // 5 menit

const attempts = new Map<string, { count: number; windowStart: number }>();

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now - entry.windowStart > WINDOW_MS) attempts.delete(key);
  }
}

export function isLockedOut(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  cleanupExpired();
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: Date.now() });
    return;
  }
  entry.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
