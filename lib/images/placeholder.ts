import sharp from "sharp";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MIN_SIDE = 16;
const MAX_SIDE = 2000;

// Mengembalikan pesan error (buat ditampilkan) atau null kalau valid.
export function validatePlaceholder(color: string, width: number, height: number): string | null {
  if (!HEX_COLOR.test(color)) return "Warna harus format #RRGGBB.";
  if (!Number.isInteger(width) || !Number.isInteger(height)) return "Lebar dan tinggi harus angka bulat.";
  if (width < MIN_SIDE || height < MIN_SIDE || width > MAX_SIDE || height > MAX_SIDE) {
    return `Lebar dan tinggi harus antara ${MIN_SIDE} dan ${MAX_SIDE} px.`;
  }
  return null;
}

// Gambar solid sebagai "wajah" image button sementara (buat nyetup/nge-test tampilan theme).
export async function makePlaceholder(color: string, width: number, height: number): Promise<Buffer> {
  const error = validatePlaceholder(color, width, height);
  if (error) throw new Error(error);
  return sharp({ create: { width, height, channels: 3, background: color } })
    .webp({ quality: 80 })
    .toBuffer();
}
