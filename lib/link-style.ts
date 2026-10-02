import { FONT_LIBRARY } from "@/lib/font-library";
import type { ThemeTokens } from "@/lib/theme";

// Override gaya per link: subset token theme yang MENIMPA theme page khusus 1 link.
// Sengaja TIDAK memakai validator lib/theme-form.ts (itu meng-import sharp/storage, server-only)
// -- file ini harus aman di-import dari Client Component (modal link + preview).

export const LINK_STYLE_GROUPS = {
  typography: ["fontFamily", "fontSize", "fontWeight", "letterSpacing"],
  shape: ["buttonSurface", "buttonBorderRadius", "buttonBorderWidth", "buttonShadow"],
  color: ["buttonText", "cardBackground", "cardBorder"],
  behavior: ["buttonHover", "pageEntrance", "buttonAlign", "linkIconPosition"],
} as const;

export type LinkStyleGroup = keyof typeof LINK_STYLE_GROUPS;
export type LinkStyleKey = (typeof LINK_STYLE_GROUPS)[LinkStyleGroup][number];
export type LinkStyleOverride = Partial<Pick<ThemeTokens, LinkStyleKey>>;

export const LINK_STYLE_GROUP_ORDER: LinkStyleGroup[] = ["typography", "shape", "color", "behavior"];

const ALL_KEYS: LinkStyleKey[] = LINK_STYLE_GROUP_ORDER.flatMap((group) => [...LINK_STYLE_GROUPS[group]]);

const ENUMS: Partial<Record<LinkStyleKey, readonly string[]>> = {
  buttonSurface: ["solid", "transparent", "glass", "blur", "neumorphism", "pixel"],
  buttonShadow: ["none", "sm", "md", "lg"],
  buttonHover: ["none", "scale", "lift", "glow", "shine"],
  pageEntrance: ["none", "fade", "slide-up", "pop"],
  buttonAlign: ["left", "center"],
  linkIconPosition: ["left", "right", "edge-left", "edge-right"],
};
const RANGES: Partial<Record<LinkStyleKey, readonly [number, number]>> = {
  fontSize: [10, 32],
  letterSpacing: [-0.1, 0.5],
  buttonBorderRadius: [0, 9999],
  buttonBorderWidth: [0, 12],
};
const FONT_WEIGHTS = [400, 500, 600, 700, 800];
const MAX_COLOR_LENGTH = 64;
// Cuma hex / rgb(a) / hsl(a) polos. Sengaja gak boleh url(), nama warna, atau ";" -- nilainya
// masuk ke inline style halaman publik dan bisa datang dari file backup orang lain.
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC_COLOR = /^(?:rgb|hsl)a?\(\s*[-\d.%\s,/]+\)$/i;

// undefined = nilai gak valid (dibuang). Angka di luar rentang di-clamp, bukan dibuang.
export function cleanOverrideValue(key: LinkStyleKey, value: unknown): string | number | undefined {
  if (key === "fontFamily") {
    return typeof value === "string" && (value === "custom" || FONT_LIBRARY.some((f) => f.key === value)) ? value : undefined;
  }
  if (key === "fontWeight") return typeof value === "number" && FONT_WEIGHTS.includes(value) ? value : undefined;
  const range = RANGES[key];
  if (range) {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    return Math.min(range[1], Math.max(range[0], value));
  }
  const allowed = ENUMS[key];
  if (allowed) return typeof value === "string" && allowed.includes(value) ? value : undefined;
  // Sisanya = key warna.
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  if (color.length === 0 || color.length > MAX_COLOR_LENGTH) return undefined;
  return HEX_COLOR.test(color) || FUNC_COLOR.test(color) ? color : undefined;
}

export function sanitizeLinkOverride(raw: unknown): LinkStyleOverride | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    if (!raw.trim()) return null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const source = parsed as Record<string, unknown>;
  const out: Record<string, string | number> = {};
  // Iterasi whitelist (BUKAN key milik input) -> __proto__/key asing gak pernah tersentuh.
  for (const key of ALL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const value = cleanOverrideValue(key, source[key]);
    if (value !== undefined) out[key] = value;
  }
  return Object.keys(out).length > 0 ? (out as LinkStyleOverride) : null;
}

export function serializeLinkOverride(raw: unknown): string | null {
  const clean = sanitizeLinkOverride(raw);
  return clean ? JSON.stringify(clean) : null;
}

// Tanpa override -> objek theme yang SAMA (bukan salinan), jadi link biasa gak berubah sama sekali.
export function resolveLinkTheme(theme: ThemeTokens, override: LinkStyleOverride | null | undefined): ThemeTokens {
  if (!override || Object.keys(override).length === 0) return theme;
  return { ...theme, ...override };
}

// Typography halaman diwarisi dari container (bukan dari getCardStyle), jadi kartu cuma
// perlu menimpanya sendiri kalau link ini beneran punya override typography.
export function hasTypographyOverride(override: LinkStyleOverride | null | undefined): boolean {
  return !!override && LINK_STYLE_GROUPS.typography.some((key) => key in override);
}

// Kelompok "nyala" = SEMUA key-nya ada. Kelompok setengah terisi dianggap mati di UI, tapi
// key yang ada tetap diterapkan saat render.
export function isGroupOn(override: LinkStyleOverride | null | undefined, group: LinkStyleGroup): boolean {
  return !!override && LINK_STYLE_GROUPS[group].every((key) => key in override);
}

// Nyala: key yang belum ada disalin dari theme (titik awal), yang sudah diubah user dibiarkan.
// Mati: hapus key kelompok itu saja. Hasil kosong -> null (= ikut theme sepenuhnya).
export function toggleGroup(
  override: LinkStyleOverride | null,
  group: LinkStyleGroup,
  on: boolean,
  theme: ThemeTokens,
): LinkStyleOverride | null {
  const next: Record<string, unknown> = { ...(override ?? {}) };
  for (const key of LINK_STYLE_GROUPS[group]) {
    if (on) {
      if (!(key in next)) next[key] = theme[key];
    } else {
      delete next[key];
    }
  }
  return Object.keys(next).length > 0 ? (next as LinkStyleOverride) : null;
}

export function setOverrideKey(
  override: LinkStyleOverride | null,
  key: LinkStyleKey,
  value: string | number,
): LinkStyleOverride {
  return { ...(override ?? {}), [key]: value } as LinkStyleOverride;
}
