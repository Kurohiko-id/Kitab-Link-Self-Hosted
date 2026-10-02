import { processImage } from "@/lib/images/process-image";
import { makePlaceholder, validatePlaceholder } from "@/lib/images/placeholder";

export const MAX_IMAGE_BUTTON_WIDTH = 1600;

// Satu pintu buat "dari form jadi buffer WebP" -- dipakai library image button (upload ATAU
// placeholder) dan form link (upload baru, fileField beda). Gak nyentuh DB/disk.
export async function readImageButtonWebp(
  formData: FormData,
  fileField = "image",
): Promise<{ webp: Buffer } | { error: string }> {
  if (formData.get("mode") === "placeholder") {
    const color = String(formData.get("placeholderColor") ?? "");
    const width = Number(formData.get("placeholderWidth"));
    const height = Number(formData.get("placeholderHeight"));
    const error = validatePlaceholder(color, width, height);
    if (error) return { error };
    return { webp: await makePlaceholder(color, width, height) };
  }

  const file = formData.get(fileField);
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih gambar dulu." };
  if (!file.type.startsWith("image/")) return { error: "File yang diupload harus berupa gambar." };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return { webp: await processImage(buffer, MAX_IMAGE_BUTTON_WIDTH) };
  } catch {
    return { error: "Gambar tidak bisa diproses." };
  }
}
