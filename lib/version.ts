import pkg from "../package.json";

export const CURRENT_VERSION: string = pkg.version;

// Bandingin "1.2.0" vs "1.10.0" per-segmen numerik -- string compare biasa salah
// (nganggep "1.10.0" < "1.2.0" karena "1" < "2" leksikal).
export function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na > nb;
  }
  return false;
}
