import { FONT_LIBRARY, CUSTOM_FONT_FAMILY } from "@/lib/font-library";

export type BackgroundType =
  | "solid"
  | "gradient"
  | "aurora"
  | "glass"
  | "neon"
  | "paper"
  | "pixel"
  | "lines"
  | "waves"
  | "network";
export type ButtonSurface = "solid" | "transparent" | "glass" | "blur" | "neumorphism" | "pixel";
export type ButtonShadow = "none" | "sm" | "md" | "lg";
export type ButtonHover = "none" | "scale" | "lift" | "glow" | "shine";
export type PageEntrance = "none" | "fade" | "slide-up" | "pop";
export type ButtonAlign = "left" | "center";
export type AvatarShape = "circle" | "rounded" | "square";
export type ProfileBorderStyle = "none" | "solid" | "fade";
export type LinkIconPosition = "left" | "right" | "edge-left" | "edge-right";
export type TextureType = "none" | "grain" | "noise" | "watermark" | "snow" | "sakura" | "particle";
export type GroupLabelAlign = "left" | "center" | "right";
// "wrap" beda sama yang lain -- bukan cuma gaya teks labelnya, tapi bikin border yang
// ngelingkupin SELURUH grup (label + link-link di dalamnya), lihat components/group-container.tsx.
export type GroupLabelStyle = "plain" | "lines" | "pill" | "underline" | "wave" | "wrap";

export type ThemeTokens = {
  backgroundType: BackgroundType;
  // Interpretasi tergantung backgroundType: solid/paper/neon pakai [0] doang,
  // gradient/glass pakai [0..1] buat linear-gradient, aurora pakai [0] (base) + [1..2] (warna blob).
  backgroundColors: string[];
  backgroundImage: string | null;
  text: string;
  textMuted: string;
  // Buat background yang RAME/pattern (waves, pixel, lines, dll) -- warna teks flat aja
  // sering gak cukup kontras di semua bagian pattern-nya (kadang gelap kadang terang).
  // Nyalain ini nambahin text-shadow tipis biar nama/bio tetep kebaca di mana aja.
  textShadow: boolean;
  // Buat pattern yang SUPER rame (kontras tinggi kayak seigaiha Japanese Wave) -- shadow
  // doang kadang gak cukup. Ini bungkus nama+bio pake "chip" semi-transparan (warna
  // cardBackground + blur) biar ada permukaan FLAT di belakang teksnya, dijamin kebaca.
  textBackdrop: boolean;
  cardBackground: string; // boleh rgba() buat efek glass
  cardBorder: string; // boleh rgba()
  buttonText: string;
  // FontKey dari lib/fonts.ts, atau "custom" buat font upload sendiri (lihat customFontUrl).
  fontFamily: string;
  fontSize: number; // px
  fontWeight: number;
  letterSpacing: number; // em
  customFontUrl: string | null;
  buttonSurface: ButtonSurface;
  buttonBorderRadius: number; // px, gede banget (mis. 9999) = pill
  buttonBorderWidth: number; // px
  buttonShadow: ButtonShadow;
  buttonHover: ButtonHover;
  pageEntrance: PageEntrance;
  buttonAlign: ButtonAlign;
  profileAvatarShape: AvatarShape;
  profileBorderStyle: ProfileBorderStyle;
  profileBorderWidth: number; // px
  profileShadow: ButtonShadow;
  profileShowBanner: boolean;
  profileAvatarFloat: boolean;
  linkIconPosition: LinkIconPosition;
  textureType: TextureType;
  textureOpacity: number; // 0-1
  groupLabelAlign: GroupLabelAlign;
  groupLabelStyle: GroupLabelStyle;
  // Cuma relevan pas groupLabelStyle "wrap" -- true = bingkai ada isian background
  // (cardBackground), false = transparan, cuma border-nya doang.
  groupWrapBackground: boolean;
  // Baris icon sosmed (atas/bawah profil) -- shape+surface KHUSUS buat baris ini, beda
  // dari buttonSurface/buttonBorderRadius yang ngatur link biasa (pill/rounded/rich).
  socialIconShape: AvatarShape;
  socialIconRadius: number; // px, cuma kepake pas socialIconShape "rounded"
  socialIconSurface: "filled" | "transparent";
  // Lebar maksimum konten halaman publik (px) -- LinkBreeze nyebutnya "container width".
  // Cuma ngaruh di halaman publik beneran (components/public-page-body.tsx), preview
  // dashboard udah punya container sendiri (phone frame/panel) jadi gak kepake di situ.
  containerWidth: number;
};

// Default theme buat page/theme baru yang belum pilih preset -- di-set ke tampilan
// "Cloudy Sky Gradient" (lihat preset id "cloudy-sky-gradient" di bawah, tokens-nya
// disalin manual ke sini, BUKAN referensi objek yang sama, biar preset itu di gallery
// tetep independen/gak ikut berubah kalau default ini di-tweak lagi nanti) + beberapa
// preferensi tetap: hover scale, entrance fade, alignment tombol+nama grup tengah, icon
// nempel kiri teks, banner mati, dan nama grup style garis samping.
export const DEFAULT_THEME: ThemeTokens = {
  backgroundType: "gradient",
  backgroundColors: ["#a1c4fd", "#c2e9fb"],
  backgroundImage: null,
  text: "#0f172a",
  textMuted: "#334155",
  textShadow: false,
  textBackdrop: false,
  cardBackground: "rgba(255,255,255,0.45)",
  cardBorder: "rgba(255,255,255,0.6)",
  buttonText: "#0f172a",
  fontFamily: "outfit",
  fontSize: 16,
  fontWeight: 500,
  letterSpacing: 0,
  customFontUrl: null,
  buttonSurface: "glass",
  buttonBorderRadius: 9999,
  buttonBorderWidth: 1,
  buttonShadow: "sm",
  buttonHover: "scale",
  pageEntrance: "fade",
  buttonAlign: "center",
  profileAvatarShape: "circle",
  profileBorderStyle: "solid",
  profileBorderWidth: 4,
  profileShadow: "md",
  profileShowBanner: false,
  profileAvatarFloat: false,
  linkIconPosition: "left",
  textureType: "none",
  textureOpacity: 0.15,
  groupLabelAlign: "center",
  groupLabelStyle: "lines",
  groupWrapBackground: true,
  socialIconShape: "circle",
  socialIconRadius: 16,
  socialIconSurface: "filled",
  containerWidth: 540,
};

export type ThemePreset = { id: string; name: string; description: string; tokens: ThemeTokens };

// Preset original (terinspirasi kategori gaya umum: gradient/aurora/neon/paper/glass —
// bukan niru desain spesifik tool lain), dibangun murni pakai CSS (gradient/blur/shadow),
// gak ada aset gambar atau font eksternal yang perlu di-fetch.
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "classic",
    name: "Classic Light",
    description: "Clean minimal light look",
    tokens: {
      backgroundType: "solid",
      backgroundColors: ["#fafafa"],
      backgroundImage: null,
      text: "#18181b",
      textMuted: "#71717a",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#ffffff",
      cardBorder: "#e4e4e7",
      buttonText: "#18181b",
      fontFamily: "inter",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 1,
      buttonShadow: "none",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      profileAvatarShape: "circle",
      profileBorderStyle: "none",
      profileBorderWidth: 2,
      profileShadow: "none",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
      containerWidth: 540,
    },
  },
  {
    id: "midnight-aurora",
    name: "Midnight Aurora",
    description: "Glowing aurora on deep navy",
    tokens: {
      backgroundType: "aurora",
      backgroundColors: ["#0f0a1e", "#7c5cff", "#22d3ee"],
      backgroundImage: null,
      text: "#f4f4f5",
      textMuted: "#a1a1aa",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(255,255,255,0.08)",
      cardBorder: "rgba(255,255,255,0.16)",
      buttonText: "#ffffff",
      fontFamily: "inter",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 1,
      buttonShadow: "md",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "fade",
      profileBorderWidth: 3,
      profileShadow: "md",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "sunset-gradient",
    name: "Sunset Gradient",
    description: "Warm orange-to-pink gradient",
    tokens: {
      backgroundType: "gradient",
      backgroundColors: ["#f97316", "#db2777"],
      backgroundImage: null,
      text: "#fff7ed",
      textMuted: "rgba(255,247,237,0.75)",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(255,255,255,0.92)",
      cardBorder: "rgba(255,255,255,0.5)",
      buttonText: "#7c2d12",
      fontFamily: "poppins",
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: -0.01,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 0,
      buttonShadow: "sm",
      buttonHover: "scale",
      pageEntrance: "pop",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 3,
      profileShadow: "sm",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "neon-nights",
    name: "Neon Nights",
    description: "Bold cyan neon glow",
    tokens: {
      backgroundType: "neon",
      backgroundColors: ["#050505", "#22d3ee"],
      backgroundImage: null,
      text: "#22d3ee",
      textMuted: "#a5f3fc",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#0a0a0a",
      cardBorder: "#22d3ee",
      buttonText: "#22d3ee",
      fontFamily: "jetbrains-mono",
      fontSize: 15,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 2,
      buttonShadow: "none",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "square",
      profileBorderStyle: "solid",
      profileBorderWidth: 2,
      profileShadow: "none",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "edge-left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "paper-ink",
    name: "Paper & Ink",
    description: "Warm paper grain texture",
    tokens: {
      backgroundType: "paper",
      backgroundColors: ["#f5f0e6"],
      backgroundImage: null,
      text: "#292524",
      textMuted: "#78716c",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#fffdf7",
      cardBorder: "#d6d3d1",
      buttonText: "#292524",
      fontFamily: "playfair-display",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 12,
      buttonBorderWidth: 1,
      buttonShadow: "sm",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "left",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "rounded",
      profileBorderStyle: "solid",
      profileBorderWidth: 1,
      profileShadow: "sm",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "grain",
      textureOpacity: 0.12,
    },
  },
  {
    id: "glass-frost",
    name: "Glass Frost",
    description: "Frosted glass blue-violet blend",
    tokens: {
      backgroundType: "glass",
      backgroundColors: ["#93c5fd", "#c4b5fd"],
      backgroundImage: null,
      text: "#1e293b",
      textMuted: "#475569",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(255,255,255,0.35)",
      cardBorder: "rgba(255,255,255,0.5)",
      buttonText: "#1e293b",
      fontFamily: "inter",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 20,
      buttonBorderWidth: 1,
      buttonShadow: "md",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "fade",
      profileBorderWidth: 3,
      profileShadow: "md",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "mint-fresh",
    name: "Mint Fresh",
    description: "Light airy mint tone",
    tokens: {
      backgroundType: "solid",
      backgroundColors: ["#ecfdf5"],
      backgroundImage: null,
      text: "#064e3b",
      textMuted: "#047857",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#ffffff",
      cardBorder: "#a7f3d0",
      buttonText: "#064e3b",
      fontFamily: "inter",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 1,
      buttonShadow: "sm",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "none",
      profileBorderWidth: 2,
      profileShadow: "sm",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    // Terinspirasi estetika blocky/voxel game pada umumnya — BUKAN preset "Minecraft"
    // (itu trademark Mojang/Microsoft), nama & warna didesain sendiri.
    id: "pixel-blocks",
    name: "Pixel Blocks",
    description: "Retro green pixel checker",
    tokens: {
      backgroundType: "pixel",
      backgroundColors: ["#5b8c3e", "#4a7530"],
      backgroundImage: null,
      text: "#f5f5f0",
      textMuted: "#d4d4c8",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#7a5230",
      cardBorder: "#4a3218",
      buttonText: "#f5f5f0",
      fontFamily: "press-start-2p",
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "pixel",
      buttonBorderRadius: 0,
      buttonBorderWidth: 3,
      buttonShadow: "none",
      buttonHover: "scale",
      pageEntrance: "pop",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "square",
      profileBorderStyle: "solid",
      profileBorderWidth: 3,
      profileShadow: "none",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "edge-left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "gaming-pulse",
    name: "Gaming Pulse",
    description: "Electric purple neon energy",
    tokens: {
      backgroundType: "neon",
      backgroundColors: ["#0a0014", "#a855f7"],
      backgroundImage: null,
      text: "#e9d5ff",
      textMuted: "#c084fc",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#150022",
      cardBorder: "#a855f7",
      buttonText: "#e9d5ff",
      fontFamily: "poppins",
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: -0.01,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 16,
      buttonBorderWidth: 1,
      buttonShadow: "lg",
      buttonHover: "scale",
      pageEntrance: "pop",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "square",
      profileBorderStyle: "fade",
      profileBorderWidth: 3,
      profileShadow: "lg",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "edge-left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "coffee-house",
    name: "Coffee House",
    description: "Cozy warm brown grain",
    tokens: {
      backgroundType: "solid",
      backgroundColors: ["#3f2a1d"],
      backgroundImage: null,
      text: "#f5e9dc",
      textMuted: "#c9ab8f",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#5c4030",
      cardBorder: "#8a6a4f",
      buttonText: "#f5e9dc",
      fontFamily: "playfair-display",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 14,
      buttonBorderWidth: 1,
      buttonShadow: "sm",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "left",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 2,
      profileShadow: "sm",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "grain",
      textureOpacity: 0.12,
    },
  },
  {
    id: "matcha-latte",
    name: "Matcha Latte",
    description: "Soft natural green tone",
    tokens: {
      backgroundType: "gradient",
      backgroundColors: ["#dce8d0", "#a8c690"],
      backgroundImage: null,
      text: "#3a4a2a",
      textMuted: "#5f7048",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#fdfbf3",
      cardBorder: "#c3d4ae",
      buttonText: "#3a4a2a",
      fontFamily: "inter",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 18,
      buttonBorderWidth: 1,
      buttonShadow: "sm",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "rounded",
      profileBorderStyle: "none",
      profileBorderWidth: 2,
      profileShadow: "sm",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "bubblegum-cute",
    name: "Bubblegum Cute",
    description: "Sweet pink-lavender gradient",
    tokens: {
      backgroundType: "gradient",
      backgroundColors: ["#ffd1e8", "#d9c5ff"],
      backgroundImage: null,
      text: "#5b2a5e",
      textMuted: "#8a5a8f",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#ffffff",
      cardBorder: "#ffb6de",
      buttonText: "#5b2a5e",
      fontFamily: "poppins",
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: -0.01,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 2,
      buttonShadow: "md",
      buttonHover: "scale",
      pageEntrance: "pop",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 3,
      profileShadow: "md",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    // Motif "seigaiha" — pola gelombang tradisional Jepang (bukan reproduksi lukisan
    // tertentu). Warna diganti ke biru-ungu + kartu glass (kontras teks lama ketuker
    // sama warna wave-nya sendiri, jadi nyaris gak kebaca -- ini fix-nya).
    id: "japanese-wave",
    name: "Japanese Wave",
    description: "Classic seigaiha wave pattern",
    tokens: {
      backgroundType: "waves",
      backgroundColors: ["#566291", "#e4e2de"],
      backgroundImage: null,
      text: "#f8fafc",
      textMuted: "#f1f5f9",
      // Pattern seigaiha-nya SUPER rame + kontras tinggi -- shadow doang kepotong sama
      // arc gelap yang lewat persis di bawah teks. textBackdrop (chip solid di belakang
      // nama+bio) yang beneran ngejamin kebaca, bukan cuma shadow.
      textShadow: false,
      textBackdrop: true,
      cardBackground: "rgba(30,41,59,0.85)",
      cardBorder: "rgba(228,226,222,0.4)",
      buttonText: "#f8fafc",
      fontFamily: "inter",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 16,
      buttonBorderWidth: 1,
      buttonShadow: "md",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "left",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 2,
      profileShadow: "sm",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "sakura",
      textureOpacity: 0.45,
    },
  },
  {
    id: "pixel-retro",
    name: "8-Bit Retro",
    description: "Pixelated purple arcade texture",
    tokens: {
      backgroundType: "pixel",
      backgroundColors: ["#120428", "#2a0a52"],
      backgroundImage: null,
      text: "#fef08a",
      textMuted: "#ddd6fe",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#240c4f",
      cardBorder: "#7c3aed",
      buttonText: "#fef08a",
      fontFamily: "press-start-2p",
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 0,
      buttonBorderWidth: 2,
      buttonShadow: "md",
      buttonHover: "scale",
      pageEntrance: "pop",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "square",
      profileBorderStyle: "solid",
      profileBorderWidth: 3,
      profileShadow: "md",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "edge-right",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "neumorphism",
    name: "Neumorphism",
    description: "Soft extruded UI aesthetic",
    tokens: {
      backgroundType: "solid",
      backgroundColors: ["#e0e5ec"],
      backgroundImage: null,
      text: "#3f3f46",
      textMuted: "#64748b",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#e0e5ec",
      cardBorder: "#e0e5ec",
      buttonText: "#4338ca",
      fontFamily: "inter",
      fontSize: 16,
      fontWeight: 600,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "neumorphism",
      buttonBorderRadius: 16,
      buttonBorderWidth: 0,
      buttonShadow: "none",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "none",
      profileBorderWidth: 2,
      profileShadow: "none",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    description: "Retro purple synthwave dream",
    tokens: {
      backgroundType: "gradient",
      backgroundColors: ["#200d3b", "#581c87"],
      backgroundImage: null,
      text: "#f0abfc",
      textMuted: "#fbcfe8",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(46,19,82,0.8)",
      cardBorder: "#a21caf",
      buttonText: "#f5d0fe",
      fontFamily: "inter",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 16,
      buttonBorderWidth: 1,
      buttonShadow: "lg",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "fade",
      profileBorderWidth: 3,
      profileShadow: "lg",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "royal-gold",
    name: "Royal Gold",
    description: "Elegant black and gold",
    tokens: {
      backgroundType: "solid",
      backgroundColors: ["#09090b"],
      backgroundImage: null,
      text: "#fde047",
      textMuted: "#fef3c7",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#18181b",
      cardBorder: "#ca8a04",
      buttonText: "#fde047",
      fontFamily: "playfair-display",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 8,
      buttonBorderWidth: 1,
      buttonShadow: "md",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 3,
      profileShadow: "md",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "cyber-hacker",
    name: "Cyber Hacker",
    description: "Matrix-style dark terminal",
    tokens: {
      backgroundType: "solid",
      backgroundColors: ["#030712"],
      backgroundImage: null,
      text: "#4ade80",
      textMuted: "#22c55e",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(20,83,45,0.25)",
      cardBorder: "#166534",
      buttonText: "#86efac",
      fontFamily: "jetbrains-mono",
      fontSize: 15,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 0,
      buttonBorderWidth: 1,
      buttonShadow: "md",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "left",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "square",
      profileBorderStyle: "solid",
      profileBorderWidth: 2,
      profileShadow: "none",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Pure black and white",
    tokens: {
      backgroundType: "solid",
      backgroundColors: ["#ffffff"],
      backgroundImage: null,
      text: "#18181b",
      textMuted: "#52525b",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "#fafafa",
      cardBorder: "#e4e4e7",
      buttonText: "#18181b",
      fontFamily: "space-grotesk",
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "solid",
      buttonBorderRadius: 8,
      buttonBorderWidth: 1,
      buttonShadow: "none",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "left",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "none",
      profileBorderWidth: 2,
      profileShadow: "none",
      profileShowBanner: false,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "cosmic-nebula",
    name: "Cosmic Nebula",
    description: "Drifting purple nebula particles",
    tokens: {
      backgroundType: "aurora",
      backgroundColors: ["#090514", "#7c3aed", "#4338ca"],
      backgroundImage: null,
      text: "#ddd6fe",
      textMuted: "#a5b4fc",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(20,11,41,0.8)",
      cardBorder: "rgba(139,92,246,0.5)",
      buttonText: "#ede9fe",
      fontFamily: "sora",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 16,
      buttonBorderWidth: 1,
      buttonShadow: "lg",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "fade",
      profileBorderWidth: 3,
      profileShadow: "lg",
      profileShowBanner: false,
      profileAvatarFloat: true,
      linkIconPosition: "left",
      textureType: "particle",
      textureOpacity: 0.4,
    },
  },
  {
    id: "sky-blue-solid",
    name: "Sky Blue Solid",
    description: "Bright solid sky-blue glass look",
    tokens: {
      backgroundType: "solid",
      backgroundColors: ["#72b0ef"],
      backgroundImage: null,
      text: "#0f172a",
      textMuted: "#334155",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(255,255,255,0.45)",
      cardBorder: "rgba(255,255,255,0.6)",
      buttonText: "#0f172a",
      fontFamily: "outfit",
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 1,
      buttonShadow: "sm",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 4,
      profileShadow: "md",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "cloudy-sky-gradient",
    name: "Cloudy Sky Gradient",
    description: "Soft cloudy blue-white gradient",
    tokens: {
      backgroundType: "gradient",
      backgroundColors: ["#a1c4fd", "#c2e9fb"],
      backgroundImage: null,
      text: "#0f172a",
      textMuted: "#334155",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(255,255,255,0.45)",
      cardBorder: "rgba(255,255,255,0.6)",
      buttonText: "#0f172a",
      fontFamily: "outfit",
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 1,
      buttonShadow: "sm",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 4,
      profileShadow: "md",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "sakura-sky-gradient",
    name: "Sakura Sky",
    description: "Sky blue drifting into soft blossom pink",
    tokens: {
      backgroundType: "gradient",
      backgroundColors: ["#a1c4fd", "#c2e9fb", "#fbcfe8"],
      backgroundImage: null,
      text: "#0f172a",
      textMuted: "#334155",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(255,255,255,0.45)",
      cardBorder: "rgba(255,255,255,0.6)",
      buttonText: "#0f172a",
      fontFamily: "outfit",
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 1,
      buttonShadow: "sm",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
      containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 4,
      profileShadow: "md",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "deep-ocean-solid",
    name: "Deep Ocean Solid",
    description: "Deep navy ocean, white glass buttons",
    tokens: {
      backgroundType: "solid",
      backgroundColors: ["#0b2545"],
      backgroundImage: null,
      text: "#ffffff",
      textMuted: "#7dd3fc",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(255,255,255,0.1)",
      cardBorder: "rgba(255,255,255,0.2)",
      buttonText: "#ffffff",
      fontFamily: "outfit",
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 1,
      buttonShadow: "none",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 4,
      profileShadow: "md",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "blue-nebula",
    name: "Blue Nebula Gradient",
    description: "Radial blue nebula glow on dark",
    tokens: {
      backgroundType: "aurora",
      backgroundColors: ["#020617", "#1b4965", "#60a5fa"],
      backgroundImage: null,
      text: "#ffffff",
      textMuted: "#93c5fd",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(255,255,255,0.1)",
      cardBorder: "rgba(255,255,255,0.2)",
      buttonText: "#ffffff",
      fontFamily: "outfit",
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 1,
      buttonShadow: "md",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 3,
      profileShadow: "md",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
  {
    id: "geometric-sky",
    name: "Geometric Sky",
    description: "Sky gradient with geometric dot grid",
    tokens: {
      backgroundType: "network",
      backgroundColors: ["#4682b4", "#bfe3ff"],
      backgroundImage: null,
      text: "#0f172a",
      textMuted: "#1e3a5f",
      textShadow: false,
      textBackdrop: false,
      cardBackground: "rgba(255,255,255,0.45)",
      cardBorder: "rgba(255,255,255,0.6)",
      buttonText: "#0f172a",
      fontFamily: "outfit",
      fontSize: 16,
      fontWeight: 500,
      letterSpacing: 0,
      customFontUrl: null,
      buttonSurface: "glass",
      buttonBorderRadius: 9999,
      buttonBorderWidth: 1,
      buttonShadow: "sm",
      buttonHover: "scale",
      pageEntrance: "fade",
      buttonAlign: "center",
      groupLabelAlign: "center",
      groupLabelStyle: "plain",
      groupWrapBackground: true,
      socialIconShape: "circle",
      socialIconRadius: 16,
      socialIconSurface: "filled",
  containerWidth: 540,
      profileAvatarShape: "circle",
      profileBorderStyle: "solid",
      profileBorderWidth: 4,
      profileShadow: "md",
      profileShowBanner: true,
      profileAvatarFloat: false,
      linkIconPosition: "left",
      textureType: "none",
      textureOpacity: 0.15,
    },
  },
];

export function parseThemeTokens(tokensJson: string | null | undefined): ThemeTokens {
  if (!tokensJson) return DEFAULT_THEME;
  try {
    const parsed = JSON.parse(tokensJson);
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return DEFAULT_THEME;
  }
}

// Curated Google Fonts di-import statis di lib/fonts.ts (next/font/google butuh nama
// font diketahui saat build) -> di sini cuma cocokin key ke CSS variable-nya. "custom"
// (upload sendiri) pakai nama @font-face terpisah, lihat getCustomFontFaceCSS().
export function getFontFamilyCSS(tokens: ThemeTokens): string {
  if (tokens.fontFamily === "custom" && tokens.customFontUrl) {
    return `"${CUSTOM_FONT_FAMILY}", sans-serif`;
  }
  const entry = FONT_LIBRARY.find((f) => f.key === tokens.fontFamily);
  if (!entry) return "var(--font-inter), sans-serif";
  return `var(${entry.cssVar}), ${entry.fallback}`;
}

// Font upload custom gak bisa dipreload lewat next/font/local (file-nya baru ada
// pas runtime, bukan colocated saat build) -> declare @font-face manual lewat <style>.
export function getCustomFontFaceCSS(tokens: ThemeTokens): string | null {
  if (tokens.fontFamily !== "custom" || !tokens.customFontUrl) return null;
  return `@font-face { font-family: "${CUSTOM_FONT_FAMILY}"; src: url(/uploads/${tokens.customFontUrl}); font-display: swap; }`;
}

export function getTypographyStyle(tokens: ThemeTokens): React.CSSProperties {
  return {
    fontFamily: getFontFamilyCSS(tokens),
    fontSize: tokens.fontSize,
    fontWeight: tokens.fontWeight,
    letterSpacing: `${tokens.letterSpacing}em`,
  };
}

// Shadow tipis TAPI dua-lapis (garis rapat + glow lebar) -- biar teks tetep kontras baik
// di atas bagian TERANG maupun GELAP dari background yang rame/pattern (bukan cuma
// nge-gelapin satu sisi doang kayak text-shadow arah tunggal biasa).
export function getTextShadowStyle(tokens: ThemeTokens): React.CSSProperties {
  if (!tokens.textShadow) return {};
  return { textShadow: "0 1px 3px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.45)" };
}

export function getPageBackgroundStyle(tokens: ThemeTokens): React.CSSProperties {
  const base: React.CSSProperties = tokens.backgroundImage
    ? {
        backgroundImage: `url(/uploads/${tokens.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : {};

  switch (tokens.backgroundType) {
    case "gradient":
    case "glass":
      return { ...base, backgroundColor: tokens.backgroundColors[0], backgroundImage: base.backgroundImage ?? `linear-gradient(135deg, ${tokens.backgroundColors.join(", ")})` };
    case "paper":
      return {
        ...base,
        backgroundColor: tokens.backgroundColors[0],
        backgroundImage:
          base.backgroundImage ?? "repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0px, transparent 1px, transparent 3px)",
      };
    case "pixel": {
      const dot = tokens.backgroundColors[1] ?? tokens.backgroundColors[0];
      return {
        ...base,
        backgroundColor: tokens.backgroundColors[0],
        backgroundImage:
          base.backgroundImage ??
          [
            `linear-gradient(45deg, ${dot} 25%, transparent 25%)`,
            `linear-gradient(-45deg, ${dot} 25%, transparent 25%)`,
            `linear-gradient(45deg, transparent 75%, ${dot} 75%)`,
            `linear-gradient(-45deg, transparent 75%, ${dot} 75%)`,
          ].join(", "),
        backgroundSize: "24px 24px",
        backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
      };
    }
    case "lines": {
      const stripe = tokens.backgroundColors[1] ?? tokens.backgroundColors[0];
      return {
        ...base,
        backgroundColor: tokens.backgroundColors[0],
        backgroundImage:
          base.backgroundImage ??
          `repeating-linear-gradient(45deg, ${stripe} 0px, ${stripe} 2px, transparent 2px, transparent 22px)`,
      };
    }
    case "waves": {
      // Pola "seigaiha" (motif gelombang tradisional Jepang, bukan reproduksi karya seni
      // tertentu) -- lingkaran bersarang beneran (SVG), bukan approksimasi gradient.
      const wave = tokens.backgroundColors[1] ?? tokens.backgroundColors[0];
      return {
        ...base,
        backgroundColor: tokens.backgroundColors[0],
        backgroundImage: base.backgroundImage ?? seigaihaDataUri(tokens.backgroundColors[0], wave),
        backgroundSize: "100px 50px",
      };
    }
    case "network": {
      // Base statis (dot-grid) buat thumbnail/fallback sebelum JS jalan — animasi
      // titik-garis sungguhan di-render terpisah lewat <NetworkBackground>, cuma di
      // preview besar & halaman publik (bukan di tiap thumbnail gallery, biar ringan).
      const dot = tokens.backgroundColors[1] ?? tokens.backgroundColors[0];
      return {
        ...base,
        backgroundColor: tokens.backgroundColors[0],
        backgroundImage: base.backgroundImage ?? `radial-gradient(circle, ${dot}55 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
      };
    }
    case "aurora":
    case "neon":
    case "solid":
    default:
      return { ...base, backgroundColor: tokens.backgroundColors[0] };
  }
}

// "aurora" butuh blob DOM terpisah (di-render manual di komponen), "lines" cukup
// satu class animasi di wrapper-nya sendiri. Dipakai buat nentuin class tambahan.
export function getAnimatedBackgroundClass(tokens: ThemeTokens): string | null {
  if (tokens.backgroundType === "lines") return "kl-lines-move";
  return null;
}

const SHADOW_PRESETS: Record<ButtonShadow, string> = {
  none: "",
  sm: "0 1px 2px rgba(0,0,0,0.08)",
  md: "0 4px 10px rgba(0,0,0,0.14)",
  lg: "0 12px 28px rgba(0,0,0,0.2)",
};

export function getCardStyle(tokens: ThemeTokens): React.CSSProperties {
  const style: React.CSSProperties = {
    backgroundColor: tokens.cardBackground,
    borderColor: tokens.cardBorder,
    color: tokens.buttonText,
    borderWidth: tokens.buttonBorderWidth,
    borderStyle: "solid",
    borderRadius: tokens.buttonBorderRadius,
  };

  if (tokens.backgroundType === "glass" || tokens.buttonSurface === "glass") {
    style.backdropFilter = "blur(16px)";
  }
  if (tokens.buttonSurface === "blur") {
    style.backdropFilter = "blur(24px)";
  }
  if (tokens.buttonSurface === "transparent") {
    style.backgroundColor = "transparent";
  }
  if (tokens.buttonSurface === "neumorphism") {
    style.borderWidth = 0;
    style.boxShadow = "8px 8px 16px rgba(0,0,0,0.15), -8px -8px 16px rgba(255,255,255,0.5)";
  }
  if (tokens.buttonSurface === "pixel") {
    style.borderRadius = 0;
    style.boxShadow = `4px 4px 0 ${tokens.cardBorder}`;
  }
  // Efek glow bawaan "neon" tetep jalan cuma kalau tombolnya polos (buttonSurface lain
  // udah punya shadow sendiri-sendiri di atas).
  if (tokens.backgroundType === "neon" && tokens.buttonSurface === "solid") {
    style.boxShadow = `0 0 16px ${tokens.cardBorder}, inset 0 0 8px ${tokens.cardBorder}33`;
  }
  if (!style.boxShadow && tokens.buttonShadow !== "none") {
    style.boxShadow = SHADOW_PRESETS[tokens.buttonShadow];
  }
  return style;
}

export function getButtonHoverClass(tokens: ThemeTokens): string | null {
  switch (tokens.buttonHover) {
    case "scale":
      return "kl-hover-scale";
    case "lift":
      return "kl-hover-lift";
    case "glow":
      return "kl-hover-glow";
    case "shine":
      return "kl-hover-shine";
    default:
      return null;
  }
}

// Delay per-kartu buat efek stagger diatur lewat CSS var --kl-index (di-set inline per
// elemen berdasarkan urutan render), animasinya sendiri di globals.css.
export function getEntranceClass(tokens: ThemeTokens): string | null {
  switch (tokens.pageEntrance) {
    case "fade":
      return "kl-entrance-fade";
    case "slide-up":
      return "kl-entrance-slide-up";
    case "pop":
      return "kl-entrance-pop";
    default:
      return null;
  }
}

export function getButtonAlignClass(tokens: ThemeTokens): string {
  return tokens.buttonAlign === "left" ? "justify-start text-left" : "justify-center text-center";
}

export function getAvatarShapeClass(tokens: ThemeTokens): string {
  switch (tokens.profileAvatarShape) {
    case "square":
      return "rounded-none";
    case "rounded":
      return "rounded-2xl";
    default:
      return "rounded-full";
  }
}

// "fade" -> border keras diganti glow lembut dua-lapis (feather look), murni CSS,
// gak butuh gradient border-image/mask yang lebih ribet buat efek yang sama-sama tipis.
export function getAvatarStyle(tokens: ThemeTokens): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (tokens.profileBorderStyle === "solid") {
    style.borderWidth = tokens.profileBorderWidth;
    style.borderStyle = "solid";
    style.borderColor = tokens.cardBorder;
  }
  if (tokens.profileBorderStyle === "fade") {
    const w = tokens.profileBorderWidth;
    style.boxShadow = `0 0 0 ${w}px ${tokens.cardBorder}66, 0 0 ${w * 4}px ${tokens.cardBorder}33`;
  }
  if (tokens.profileShadow !== "none" && !style.boxShadow) {
    style.boxShadow = SHADOW_PRESETS[tokens.profileShadow];
  }
  return style;
}

// Shape+surface baris icon sosmed -- SENGAJA terpisah dari getCardStyle/buttonBorderRadius
// (link biasa) karena icon sosmed butuh kontrol sendiri (circle/rounded/square + transparent),
// user gak selalu mau baris icon sosmed ngikut bentuk tombol link biasa.
export function getSocialIconShapeClass(tokens: ThemeTokens): string {
  switch (tokens.socialIconShape) {
    case "square":
      return "rounded-none";
    case "rounded":
      return ""; // radius custom lewat inline style (angka bebas, gak fixed kayak avatar)
    default:
      return "rounded-full";
  }
}

export function getSocialIconStyle(tokens: ThemeTokens): React.CSSProperties {
  const transparent = tokens.socialIconSurface === "transparent";
  const style: React.CSSProperties = {
    backgroundColor: transparent ? "transparent" : tokens.cardBackground,
    borderColor: tokens.cardBorder,
    color: tokens.buttonText,
    borderWidth: transparent ? 0 : tokens.buttonBorderWidth,
    borderStyle: "solid",
  };
  if (tokens.socialIconShape === "rounded") {
    style.borderRadius = tokens.socialIconRadius;
  }
  return style;
}

// grain/noise pakai SVG feTurbulence (data URI, gak butuh file/request eksternal),
// dibedain lewat baseFrequency: grain halus & rapat, noise lebih kasar & besar.
// watermark cuma pola geometris diagonal berulang, murni CSS gradient.
function turbulenceDataUri(baseFrequency: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}")`;
}

// Motif "seigaiha" (gelombang tradisional Jepang) beneran pake SVG lingkaran bersarang
// (bukan approksimasi repeating-radial-gradient CSS kayak sebelumnya -- itu hasilnya
// keliatan aneh/gak mirip). Pola persis sama kayak referensi user, cuma warnanya
// diparameterin ke backgroundColors theme (bukan hex fixed).
function seigaihaDataUri(fill: string, stroke: string): string {
  const c = (cx: number, cy: number, r: number) =>
    `<circle cx='${cx}' cy='${cy}' r='${r}' fill='${fill}' stroke-width='4' stroke='${stroke}'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 25' width='50' height='25'>${c(0, 12.5, 24)}${c(0, 12.5, 16)}${c(0, 12.5, 8)}${c(0, 12.5, 2)}${c(50, 12.5, 24)}${c(50, 12.5, 16)}${c(50, 12.5, 8)}${c(50, 12.5, 2)}${c(25, 25, 24)}${c(25, 25, 16)}${c(25, 25, 8)}${c(25, 25, 2)}${c(0, 37.5, 24)}${c(0, 37.5, 16)}${c(50, 37.5, 24)}${c(50, 37.5, 16)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}")`;
}

// Overlay ini sengaja di-render PALING ATAS (z-index tertinggi, di luar konten
// z-10), biar grain/noise-nya keliatan nutupin seluruh halaman termasuk card,
// bukan cuma background polos di baliknya. pointerEvents none biar klik tombol
// tetep tembus.
export function getTextureOverlayStyle(tokens: ThemeTokens): React.CSSProperties | null {
  if (tokens.textureType === "none" || tokens.textureType === "snow" || tokens.textureType === "sakura" || tokens.textureType === "particle")
    return null;

  const base: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 30,
    pointerEvents: "none",
    opacity: tokens.textureOpacity,
  };

  if (tokens.textureType === "grain") {
    return { ...base, backgroundImage: turbulenceDataUri(0.9), mixBlendMode: "overlay" };
  }
  if (tokens.textureType === "noise") {
    return { ...base, backgroundImage: turbulenceDataUri(0.15), mixBlendMode: "overlay" };
  }
  // watermark: pola diamond diagonal berulang, warna ngikutin `text` theme.
  return {
    ...base,
    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 38px, ${tokens.text} 38px, ${tokens.text} 40px), repeating-linear-gradient(-45deg, transparent, transparent 38px, ${tokens.text} 38px, ${tokens.text} 40px)`,
  };
}

const TEXTURE_OVERLAY_CLASS: Partial<Record<TextureType, string>> = {
  snow: "kl-snow-overlay",
  sakura: "kl-sakura-overlay",
  particle: "kl-particle-overlay",
};

export function getTextureOverlayClass(tokens: ThemeTokens): string | null {
  return TEXTURE_OVERLAY_CLASS[tokens.textureType] ?? null;
}
