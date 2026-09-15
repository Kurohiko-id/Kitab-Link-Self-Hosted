// Data murni (nama, key, fallback) -> aman diimport dari mana aja (lib/theme.ts, server
// actions, script test), TIDAK ada next/font/google di sini. next/font cuma bisa jalan
// lewat compiler Next sendiri, jadi loader asli (yang perlu itu) dipisah ke lib/fonts.ts.
export type FontKey =
  | "inter"
  | "poppins"
  | "jetbrains-mono"
  | "sora"
  | "outfit"
  | "playfair-display"
  | "press-start-2p"
  | "roboto-mono"
  | "space-grotesk"
  | "nunito";

export const FONT_LIBRARY: { key: FontKey; label: string; cssVar: string; fallback: string }[] = [
  { key: "inter", label: "Inter", cssVar: "--font-inter", fallback: "sans-serif" },
  { key: "poppins", label: "Poppins", cssVar: "--font-poppins", fallback: "sans-serif" },
  { key: "jetbrains-mono", label: "JetBrains Mono", cssVar: "--font-jetbrains-mono", fallback: "monospace" },
  { key: "sora", label: "Sora", cssVar: "--font-sora", fallback: "sans-serif" },
  { key: "outfit", label: "Outfit", cssVar: "--font-outfit", fallback: "sans-serif" },
  { key: "playfair-display", label: "Playfair Display", cssVar: "--font-playfair-display", fallback: "serif" },
  { key: "press-start-2p", label: "Press Start 2P (8-bit)", cssVar: "--font-press-start-2p", fallback: "monospace" },
  { key: "roboto-mono", label: "Roboto Mono", cssVar: "--font-roboto-mono", fallback: "monospace" },
  { key: "space-grotesk", label: "Space Grotesk", cssVar: "--font-space-grotesk", fallback: "sans-serif" },
  { key: "nunito", label: "Nunito", cssVar: "--font-nunito", fallback: "sans-serif" },
];

export const CUSTOM_FONT_FAMILY = "kl-custom-font";
export const FONT_UPLOAD_EXTENSIONS = ["ttf", "otf", "woff", "woff2"];
