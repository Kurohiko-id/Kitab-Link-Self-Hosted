import { hash, verify } from "@node-rs/argon2";

// Parameter OWASP-recommended buat Argon2id (kebetulan ini juga default bawaan library-nya --
// dipasang eksplisit di sini biar gak diam-diam berubah kalau default upstream ganti).
// algorithm: 2 = Argon2id ("const enum Algorithm" di @node-rs/argon2 gak bisa diimport
// langsung di sini -- Next.js/SWC transpile per-file (isolatedModules), gak kompatibel
// sama ambient const enum).
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    // Argon2id PHC-format hash udah self-describing (algorithm/cost/salt semua ke-embed
    // di string hash-nya sendiri) -- gak perlu (dan gak boleh) di-override lewat options
    // di sini, itu cuma buat "secret"/pepper opsional yang gak kita pakai.
    return await verify(storedHash, password);
  } catch {
    // Hash korup/malformed (data lama rusak, dll) -- treat sebagai "salah", jangan biarin
    // exception nyampur ke caller (bisa jadi 500 mentah alih-alih pesan "password salah").
    return false;
  }
}
