import crypto from "node:crypto";

// Token one-time buat proteksi race-condition di /setup -- tanpa ini, siapa pun yang nemu
// URL server duluan (sebelum owner sempet bikin akun) bisa daftar jadi admin pertama & lock
// out owner-nya sendiri dari page-nya sendiri. Beda dari master-secret (lib/auth/master-
// secret.ts): token ini SENGAJA gak dipersist ke disk -- generate baru tiap kali dibutuhin
// pertama kali per proses boot itu udah cukup (kalau container restart sebelum setup
// selesai, token lama otomatis invalid, itu bukan masalah, ownernya tinggal `docker logs`
// lagi buat liat yang baru). Dicetak ke stdout (bukan file) biar kebaca lewat `docker logs`/
// `podman logs`/dashboard log viewer Portainer-Coolify-NAS, semua nangkep stdout container
// yang sama tanpa kerjaan tambahan.
let token: string | null = null;

export function getSetupToken(): string {
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    console.log(`[kitab-link] Setup token (masukin di halaman /setup buat bikin akun admin pertama): ${token}`);
  }
  return token;
}

export function verifySetupToken(submitted: string): boolean {
  const expected = Buffer.from(getSetupToken());
  const actual = Buffer.from(submitted);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
