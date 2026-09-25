// Kurasi manual (bukan generate dari library/API luar -- Tailwind v4 udah gak nyediain
// palet warnanya sebagai data JS yang bisa di-import lagi, cuma custom property CSS OKLCH
// di internal package-nya, gak stabil buat digantungin). Tujuannya buat pemula yang bingung
// mulai dari mana kalau cuma dikasih field hex kosong -- klik kategori, klik warna, beres.
export type ColorSwatch = { hex: string; name: string };
export type ColorPaletteCategory = { id: string; label: string; swatches: ColorSwatch[] };

export const COLOR_PALETTES: ColorPaletteCategory[] = [
  {
    id: "pastel",
    label: "Pastel",
    swatches: [
      { hex: "#FBCFE8", name: "Blush Pink" },
      { hex: "#FED7AA", name: "Peach" },
      { hex: "#FEF08A", name: "Butter Yellow" },
      { hex: "#BBF7D0", name: "Mint" },
      { hex: "#BAE6FD", name: "Sky" },
      { hex: "#DDD6FE", name: "Lavender" },
      { hex: "#F5D0FE", name: "Lilac" },
      { hex: "#FEF3C7", name: "Cream" },
    ],
  },
  {
    id: "vibrant",
    label: "Vibrant",
    swatches: [
      { hex: "#EF4444", name: "Red" },
      { hex: "#F97316", name: "Orange" },
      { hex: "#F59E0B", name: "Amber" },
      { hex: "#22C55E", name: "Green" },
      { hex: "#14B8A6", name: "Teal" },
      { hex: "#3B82F6", name: "Blue" },
      { hex: "#8B5CF6", name: "Violet" },
      { hex: "#EC4899", name: "Pink" },
    ],
  },
  {
    id: "muted",
    label: "Muted",
    swatches: [
      { hex: "#C2704D", name: "Terracotta" },
      { hex: "#B08968", name: "Clay" },
      { hex: "#9CAF88", name: "Sage" },
      { hex: "#7C8B5E", name: "Olive" },
      { hex: "#7B9EA8", name: "Dusty Blue" },
      { hex: "#9C8AA5", name: "Mauve" },
      { hex: "#D2B48C", name: "Sand" },
      { hex: "#A69080", name: "Taupe" },
    ],
  },
  {
    id: "dark",
    label: "Dark",
    swatches: [
      { hex: "#1E293B", name: "Midnight" },
      { hex: "#27272A", name: "Charcoal" },
      { hex: "#6B1E2B", name: "Wine" },
      { hex: "#14532D", name: "Forest" },
      { hex: "#172554", name: "Navy" },
      { hex: "#3B0764", name: "Plum" },
      { hex: "#3E2723", name: "Espresso" },
      { hex: "#334155", name: "Slate" },
    ],
  },
  {
    id: "neutral",
    label: "Neutral",
    swatches: [
      { hex: "#FFFFFF", name: "White" },
      { hex: "#F8FAFC", name: "Off White" },
      { hex: "#E5E7EB", name: "Light Gray" },
      { hex: "#9CA3AF", name: "Gray" },
      { hex: "#4B5563", name: "Dark Gray" },
      { hex: "#1F2937", name: "Dark Charcoal" },
      { hex: "#000000", name: "Black" },
      { hex: "#FAF9F6", name: "Off White Warm" },
    ],
  },
];

// Beda dari COLOR_PALETTES di atas (yang isi 1 field doang) -- ini kombo LENGKAP siap
// pakai (background + tombol + border + text + text pudar), sengaja dites kontrasnya
// manual satu-satu (mis. buttonText putih di atas cardBackground gelap, item Dark) biar
// begitu diterapin langsung kebaca, gak perlu user cocokin sendiri satu-satu.
export type ColorSchemeCategoryId = "pastel" | "vibrant" | "muted" | "dark" | "neutral";
export type ColorScheme = {
  id: string;
  name: string;
  category: ColorSchemeCategoryId;
  background: string;
  text: string;
  textMuted: string;
  cardBackground: string;
  cardBorder: string;
  buttonText: string;
};

export const COLOR_SCHEME_CATEGORIES: { id: ColorSchemeCategoryId; label: string }[] = [
  { id: "pastel", label: "Pastel" },
  { id: "vibrant", label: "Vibrant" },
  { id: "muted", label: "Muted" },
  { id: "dark", label: "Dark" },
  { id: "neutral", label: "Neutral" },
];

export const COLOR_SCHEMES: ColorScheme[] = [
  // Pastel
  { id: "cotton-candy", name: "Cotton Candy", category: "pastel", background: "#FFF0F5", text: "#4A044E", textMuted: "#7E22CE", cardBackground: "#FBCFE8", cardBorder: "#F472B6", buttonText: "#831843" },
  { id: "mint-cream", name: "Mint Cream", category: "pastel", background: "#F0FDF4", text: "#14532D", textMuted: "#4D7C0F", cardBackground: "#BBF7D0", cardBorder: "#4ADE80", buttonText: "#14532D" },
  { id: "peach-fuzz", name: "Peach Fuzz", category: "pastel", background: "#FFF7ED", text: "#7C2D12", textMuted: "#C2410C", cardBackground: "#FED7AA", cardBorder: "#FB923C", buttonText: "#7C2D12" },
  { id: "sky-whisper", name: "Sky Whisper", category: "pastel", background: "#F0F9FF", text: "#0C4A6E", textMuted: "#0369A1", cardBackground: "#BAE6FD", cardBorder: "#38BDF8", buttonText: "#0C4A6E" },
  { id: "lilac-dream", name: "Lilac Dream", category: "pastel", background: "#FAF5FF", text: "#581C87", textMuted: "#7E22CE", cardBackground: "#E9D5FF", cardBorder: "#C084FC", buttonText: "#581C87" },
  // Vibrant
  { id: "sunset-pop", name: "Sunset Pop", category: "vibrant", background: "#FFFFFF", text: "#111111", textMuted: "#52525B", cardBackground: "#F97316", cardBorder: "#EA580C", buttonText: "#FFFFFF" },
  { id: "electric-lime", name: "Electric Lime", category: "vibrant", background: "#FFFFFF", text: "#111111", textMuted: "#3F3F46", cardBackground: "#84CC16", cardBorder: "#4D7C0F", buttonText: "#111111" },
  { id: "hot-pink", name: "Hot Pink", category: "vibrant", background: "#FFFFFF", text: "#111111", textMuted: "#52525B", cardBackground: "#EC4899", cardBorder: "#BE185D", buttonText: "#FFFFFF" },
  { id: "royal-blue", name: "Royal Blue", category: "vibrant", background: "#FFFFFF", text: "#111111", textMuted: "#52525B", cardBackground: "#2563EB", cardBorder: "#1D4ED8", buttonText: "#FFFFFF" },
  { id: "cherry-red", name: "Cherry Red", category: "vibrant", background: "#FFFFFF", text: "#111111", textMuted: "#52525B", cardBackground: "#DC2626", cardBorder: "#B91C1C", buttonText: "#FFFFFF" },
  // Muted
  { id: "terracotta-clay", name: "Terracotta Clay", category: "muted", background: "#FAF6F1", text: "#44403C", textMuted: "#78716C", cardBackground: "#C2704D", cardBorder: "#9A5333", buttonText: "#FFF7ED" },
  { id: "sage-garden", name: "Sage Garden", category: "muted", background: "#F5F5F0", text: "#3F3F2E", textMuted: "#6B6B54", cardBackground: "#9CAF88", cardBorder: "#798A68", buttonText: "#FFFFFF" },
  { id: "dusty-rose", name: "Dusty Rose", category: "muted", background: "#FAF5F3", text: "#4A3B37", textMuted: "#8A736C", cardBackground: "#C9A3A0", cardBorder: "#A97D7A", buttonText: "#3A2B28" },
  { id: "stone-taupe", name: "Stone Taupe", category: "muted", background: "#F7F5F2", text: "#44403C", textMuted: "#78716C", cardBackground: "#A69080", cardBorder: "#78644F", buttonText: "#FFFFFF" },
  { id: "dusty-blue", name: "Dusty Blue", category: "muted", background: "#F4F7F8", text: "#33424A", textMuted: "#6B8087", cardBackground: "#7B9EA8", cardBorder: "#5A7E88", buttonText: "#FFFFFF" },
  // Dark
  { id: "midnight", name: "Midnight", category: "dark", background: "#0F172A", text: "#E2E8F0", textMuted: "#94A3B8", cardBackground: "#1E293B", cardBorder: "#334155", buttonText: "#F1F5F9" },
  { id: "espresso", name: "Espresso", category: "dark", background: "#1C1410", text: "#EDE4DA", textMuted: "#B8A796", cardBackground: "#3E2723", cardBorder: "#5D4037", buttonText: "#F5EDE4" },
  { id: "deep-forest", name: "Deep Forest", category: "dark", background: "#0A1F14", text: "#DCFCE7", textMuted: "#86EFAC", cardBackground: "#14532D", cardBorder: "#166534", buttonText: "#F0FDF4" },
  { id: "wine-cellar", name: "Wine Cellar", category: "dark", background: "#1A0A0F", text: "#FCE7EC", textMuted: "#E9A8B8", cardBackground: "#6B1E2B", cardBorder: "#881337", buttonText: "#FFF1F2" },
  { id: "charcoal-slate", name: "Charcoal Slate", category: "dark", background: "#18181B", text: "#F4F4F5", textMuted: "#A1A1AA", cardBackground: "#27272A", cardBorder: "#3F3F46", buttonText: "#FAFAFA" },
  // Neutral
  { id: "pure-mono", name: "Pure Mono", category: "neutral", background: "#FFFFFF", text: "#111111", textMuted: "#6B7280", cardBackground: "#F3F4F6", cardBorder: "#D1D5DB", buttonText: "#111111" },
  { id: "soft-gray", name: "Soft Gray", category: "neutral", background: "#F9FAFB", text: "#1F2937", textMuted: "#6B7280", cardBackground: "#E5E7EB", cardBorder: "#9CA3AF", buttonText: "#1F2937" },
  { id: "warm-sand", name: "Warm Sand", category: "neutral", background: "#FAF9F6", text: "#292524", textMuted: "#78716C", cardBackground: "#E7E5E0", cardBorder: "#A8A29E", buttonText: "#292524" },
  { id: "cool-slate", name: "Cool Slate", category: "neutral", background: "#F8FAFC", text: "#0F172A", textMuted: "#64748B", cardBackground: "#E2E8F0", cardBorder: "#94A3B8", buttonText: "#0F172A" },
  { id: "ink-and-paper", name: "Ink & Paper", category: "neutral", background: "#FAFAFA", text: "#000000", textMuted: "#525252", cardBackground: "#171717", cardBorder: "#000000", buttonText: "#FFFFFF" },
];
