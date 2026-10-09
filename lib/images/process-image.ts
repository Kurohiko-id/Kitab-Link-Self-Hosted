import sharp from "sharp";

// animated=false (default) cuma ambil frame pertama GIF/WebP animasi; nyalain cuma buat
// tempat yang memang mau animasinya jalan (sekarang: background theme).
export async function processImage(input: Buffer, maxWidth: number, animated = false): Promise<Buffer> {
  return sharp(input, { animated })
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

// Favicon SENGAJA keluar PNG (bukan webp kayak processImage) -- dukungan webp buat
// favicon masih inkonsisten di beberapa browser/OS, PNG paling aman di mana-mana.
export async function processFavicon(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize({ width: 512, height: 512, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
