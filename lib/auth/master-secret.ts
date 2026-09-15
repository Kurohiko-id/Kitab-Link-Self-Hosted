import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Ganti pendekatan "AUTH_SECRET wajib di-set manual lewat env var" -- itu melanggar prinsip
// "docker run satu baris tanpa setup manual" di CLAUDE.md (LinkBreeze sendiri masih begini,
// user disuruh jalanin `openssl rand -hex 32` terus paste ke compose file). Di sini secret
// di-generate sendiri sekali di first boot, disimpen ke file di data dir (volume yang sama
// kayak database), lalu dipakai ulang tiap restart. Dipakai buat sign session cookie
// (lib/auth/hmac.ts) DAN derive key AES-256-GCM buat encrypt TOTP secret.
const SECRET_PATH = process.env.SECRET_PATH ?? path.join(process.cwd(), "data", ".secret");

let cachedSecret: string | null = null;

// Lazy (bukan langsung di-eval pas module di-import) -- kalau di-eval-eager, `next build`
// ikut ngejalanin ini (sudah dites: SECRET_PATH kebentuk pas `npm run build`), yang bahaya
// kalau nanti Docker image ngejalanin `npm run build` DI DALEM image build step -> secret-nya
// ke-bake permanen ke image, sama buat semua orang yang pull image itu. Dengan lazy, secret
// baru ke-generate pas runtime beneran butuh (request pertama), bukan pas build.
function loadOrCreateSecret(): string {
  if (cachedSecret) return cachedSecret;

  try {
    // turbopackIgnore -- path-nya sebagian dinamis (bisa di-override SECRET_PATH env var),
    // Turbopack gak bisa statically narrow itu jadi worst-case nge-trace SELURUH project ke
    // output server (bikin image Docker bengkak). Aman diabaikan: baca file kecil di data
    // dir doang, bukan sesuatu yang perlu di-bundle Turbopack.
    const existing = fs.readFileSync(/* turbopackIgnore: true */ SECRET_PATH, "utf8").trim();
    if (existing) return (cachedSecret = existing);
  } catch {
    // file belum ada -> generate baru di bawah
  }

  const secret = crypto.randomBytes(32).toString("hex");
  fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true });
  try {
    // flag "wx" -- gagal (EEXIST) kalau file udah ada, biar atomic: kalau ada 2 request/
    // proses barengan pas first boot dan dua-duanya ngira file belum ada, cuma SATU yang
    // menang nulis; yang kalah baca ulang file punya si pemenang, bukan overwrite silent.
    fs.writeFileSync(/* turbopackIgnore: true */ SECRET_PATH, secret, { mode: 0o600, flag: "wx" });
    // PENTING buat operator: kalau baris ini kemunculan tiap restart (bukan cuma sekali pas
    // first boot), berarti data dir gak ke-mount sebagai volume persist -> semua session bakal
    // ke-invalidate tiap restart container.
    console.log(`[kitab-link] Generated new signing secret at ${SECRET_PATH}`);
    return (cachedSecret = secret);
  } catch {
    // Proses/request lain menang duluan nulis di antara readFileSync gagal & writeFileSync
    // ini -- baca punya dia, JANGAN overwrite (dua secret berbeda di 2 request = signature
    // silang gak valid).
    return (cachedSecret = fs.readFileSync(/* turbopackIgnore: true */ SECRET_PATH, "utf8").trim());
  }
}

export function getMasterSecret(): string {
  return loadOrCreateSecret();
}

const derivedKeyCache = new Map<string, Buffer>();

// Derive key terpisah per "purpose" dari satu master secret (bukan reuse mentah-mentah buat
// beberapa algoritma kripto berbeda) -- dipakai TOTP buat AES-256-GCM key (32 byte). Di-cache
// per purpose+length -- scryptSync sengaja lambat (~50-100ms, itu emang tujuannya buat key
// derivation), tapi kalau di-panggil ulang tiap encrypt/decrypt (bisa beberapa kali per
// request) itu jadi latency yang gak perlu -- hasilnya deterministic buat purpose+secret yang
// sama, aman di-cache di memori proses.
export function deriveKey(purpose: string, length: number): Buffer {
  const cacheKey = `${purpose}:${length}`;
  const cached = derivedKeyCache.get(cacheKey);
  if (cached) return cached;

  const key = crypto.scryptSync(getMasterSecret(), `kitab-link:${purpose}`, length);
  derivedKeyCache.set(cacheKey, key);
  return key;
}
