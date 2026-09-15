import { hash, verify } from "@node-rs/argon2";
import bcrypt from "bcrypt";

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

// Migrasi transparan dari bcrypt (CLAUDE.md: gak boleh nyuruh user jalanin migration
// manual). Hash lama ($2a$/$2b$, dari cost 10) masih bisa diverifikasi, tapi needsRehash
// true kalau match -- caller tanggung jawab re-hash ke Argon2id & update row-nya. Lama-
// lama semua hash bcrypt di database ke-replace natural pas user/visitor berhasil login,
// tanpa perlu batch migration terpisah.
export async function verifyPassword(storedHash: string, password: string): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (storedHash.startsWith("$argon2")) {
    try {
      // Argon2id PHC-format hash udah self-describing (algorithm/cost/salt semua ke-embed
      // di string hash-nya sendiri) -- gak perlu (dan gak boleh) di-override lewat options
      // di sini, itu cuma buat "secret"/pepper opsional yang gak kita pakai.
      return { valid: await verify(storedHash, password), needsRehash: false };
    } catch {
      // Hash korup/malformed (data lama rusak, dll) -- treat sebagai "salah", jangan biarin
      // exception nyampur ke caller (bisa jadi 500 mentah alih-alih pesan "password salah").
      return { valid: false, needsRehash: false };
    }
  }
  const valid = await bcrypt.compare(password, storedHash);
  return { valid, needsRehash: valid };
}
