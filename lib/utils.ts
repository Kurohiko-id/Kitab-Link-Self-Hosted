export { cn } from "cn"

// Style buat <input type="file"> polos, dipakai di banyak tempat (upload thumbnail/avatar/
// banner/favicon/OG image/font) -- border+hover ditambahin biar tombol "Choose File" bawaan
// browser keliatan jelas bisa diklik (sebelumnya cuma beda background tipis, gampang
// kelewatan/dikira teks biasa).
export const FILE_INPUT_CLASS =
  "text-xs text-muted-foreground file:mr-2 file:cursor-pointer file:rounded-lg file:border file:border-input file:bg-background file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground file:transition-colors hover:file:bg-muted dark:file:bg-input/30"
