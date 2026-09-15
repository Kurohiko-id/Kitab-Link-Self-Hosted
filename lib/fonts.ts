import {
  Inter,
  Poppins,
  JetBrains_Mono,
  Sora,
  Outfit,
  Playfair_Display,
  Press_Start_2P,
  Roboto_Mono,
  Space_Grotesk,
  Nunito,
} from "next/font/google";

// Semua free & bebas dipakai komersial (Google Fonts / SIL Open Font License).
// preload:false -> @font-face selalu ke-declare tapi file cuma ke-fetch browser
// pas beneran dipakai (fontFamily match), jadi halaman publik tetap ringan
// walau daftar font-nya banyak.
// next/font butuh argumen object literal (gak boleh spread/variable) biar bisa
// dianalisis statis saat build, jadi tiap font ditulis lengkap satu-satu. Ini cuma
// bisa diimport dari kode yang dijalanin lewat compiler Next (bukan script tsx biasa)
// -> data font (key/label/cssVar) yang perlu portable ada di lib/font-library.ts.
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "600", "800"],
  variable: "--font-poppins",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-jetbrains-mono",
});
const sora = Sora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-sora" });
const outfit = Outfit({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-outfit" });
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-playfair-display",
});
const pressStart2p = Press_Start_2P({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-press-start-2p",
});
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-roboto-mono",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-space-grotesk",
});
const nunito = Nunito({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-nunito" });

// Class gabungan buat ditempel di <html> sekali di root layout, biar semua CSS
// variable-nya selalu tersedia (tanpa itu pun @font-face gak pernah fetch file).
export const FONT_VARIABLE_CLASS = [
  inter,
  poppins,
  jetbrainsMono,
  sora,
  outfit,
  playfairDisplay,
  pressStart2p,
  robotoMono,
  spaceGrotesk,
  nunito,
]
  .map((f) => f.variable)
  .join(" ");

export { FONT_LIBRARY, CUSTOM_FONT_FAMILY, FONT_UPLOAD_EXTENSIONS, type FontKey } from "@/lib/font-library";
