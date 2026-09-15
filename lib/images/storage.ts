import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Mengikuti docs/arsitektur-link-in-bio.md bagian 5: sqlite db + gambar upload
// sama-sama disimpan di data/ supaya ikut ke-mount sebagai satu volume saat deploy.
const UPLOAD_ROOT = process.env.UPLOAD_PATH ?? path.join(process.cwd(), "data", "uploads");

export async function saveImage(buffer: Buffer, subdir: string): Promise<string> {
  // subdir ditentukan pemanggil ("link-thumbnails", dst), bukan konstanta statis.
  const dir = path.join(/* turbopackIgnore: true */ UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  await writeFile(path.join(dir, filename), buffer);
  return `${subdir}/${filename}`;
}

// File apa aja disimpan apa adanya, gak lewat sharp (itu cuma buat gambar) -> extension
// aslinya dipertahankan, caller yang validasi extension-nya. Dipakai buat font upload
// (subdir "theme-fonts") dan link tipe "file" (subdir "link-files").
export async function saveFile(buffer: Buffer, subdir: string, extension: string): Promise<string> {
  const dir = path.join(/* turbopackIgnore: true */ UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(/* turbopackIgnore: true */ dir, filename), buffer);
  return `${subdir}/${filename}`;
}

export function saveFont(buffer: Buffer, extension: string): Promise<string> {
  return saveFile(buffer, "theme-fonts", extension);
}

export async function deleteImage(relativePath: string | null | undefined) {
  if (!relativePath) return;
  try {
    // Nama file ditentukan runtime (upload user), jadi sengaja gak bisa dianalisis statis.
    await unlink(path.join(/* turbopackIgnore: true */ UPLOAD_ROOT, relativePath));
  } catch {
    // File sudah tidak ada / tidak pernah ada — aman diabaikan.
  }
}

export function resolveUploadPath(relativePath: string): string {
  return path.join(/* turbopackIgnore: true */ UPLOAD_ROOT, relativePath);
}
