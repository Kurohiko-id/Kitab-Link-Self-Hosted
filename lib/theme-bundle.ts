import { FONT_UPLOAD_EXTENSIONS } from "@/lib/font-library";
import { processImage } from "@/lib/images/process-image";
import type { ThemeTokens } from "@/lib/theme";

export const BUNDLE_VERSION = 2;
export const MAX_BUNDLE_ASSETS = 100;
export const MAX_BUNDLE_BYTES = 15 * 1024 * 1024; // total ukuran aset setelah di-decode
const IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg", "gif"];
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

export type LoadedAsset = { kind: "image" | "font"; ext: string; data: Buffer };
type BundleAsset = { kind: "image" | "font"; ext: string; b64: string };
export type ThemeBundle = {
  kitablink_theme: 2;
  tokens: Record<string, unknown>;
  imageButtons: { label: string; asset: string }[];
  assets: Record<string, BundleAsset>;
};
export type ParsedBundle = {
  tokens: Record<string, unknown>;
  background: LoadedAsset | null;
  font: LoadedAsset | null;
  buttons: { label: string; image: LoadedAsset }[];
};
export type BundleError = "wrong_format" | "too_large" | "bad_asset";

export function isBundle(value: unknown): boolean {
  return typeof value === "object" && value !== null && (value as { kitablink_theme?: unknown }).kitablink_theme === BUNDLE_VERSION;
}

// Path upload relatif yang aman dibaca dari disk -- tokens bisa datang dari file import
// orang lain, jadi backgroundImage/customFontUrl gak boleh dipakai buat baca file di luar
// folder uploads.
export function isSafeUploadPath(p: string): boolean {
  if (!p || p.startsWith("/") || p.includes("\\") || /^[a-zA-Z]:/.test(p)) return false;
  return !p.split("/").some((part) => part === ".." || part === "");
}

const toBundleAsset = (a: LoadedAsset): BundleAsset => ({ kind: a.kind, ext: a.ext, b64: a.data.toString("base64") });

export function buildBundle(input: {
  tokens: ThemeTokens;
  background: LoadedAsset | null;
  font: LoadedAsset | null;
  buttons: { label: string; image: LoadedAsset }[];
}): ThemeBundle {
  const assets: Record<string, BundleAsset> = {};
  const tokens: Record<string, unknown> = { ...input.tokens, backgroundImage: null, customFontUrl: null };
  if (input.background) {
    assets.bg = toBundleAsset(input.background);
    tokens.backgroundImage = "asset:bg";
  }
  if (input.font) {
    assets.font = toBundleAsset(input.font);
    tokens.customFontUrl = "asset:font";
  }
  const imageButtons = input.buttons.map((button, i) => {
    assets[`btn${i}`] = toBundleAsset(button.image);
    return { label: button.label, asset: `btn${i}` };
  });
  return { kitablink_theme: BUNDLE_VERSION, tokens, imageButtons, assets };
}

// Konversi SEMUA gambar bundle ke WebP dulu, sebelum caller nulis apa pun ke disk/DB: byte
// yang lolos cek ekstensi/base64 tapi bukan gambar beneran bikin sharp throw, dan itu gak
// boleh ninggalin import setengah jalan (sebagian image button udah ke-create).
export async function convertBundleImages(
  bundle: ParsedBundle,
): Promise<{ background: Buffer | null; buttons: { label: string; webp: Buffer }[] } | { error: "bad_asset" }> {
  try {
    const background = bundle.background ? await processImage(bundle.background.data, 1600, true) : null;
    const buttons: { label: string; webp: Buffer }[] = [];
    for (const button of bundle.buttons) {
      buttons.push({ label: button.label, webp: await processImage(button.image.data, 1600) });
    }
    return { background, buttons };
  } catch {
    return { error: "bad_asset" };
  }
}

export function parseBundle(raw: unknown): ParsedBundle | { error: BundleError } {
  if (!isBundle(raw)) return { error: "wrong_format" };
  const bundle = raw as Partial<ThemeBundle>;
  if (typeof bundle.tokens !== "object" || bundle.tokens === null || Array.isArray(bundle.tokens)) {
    return { error: "wrong_format" };
  }
  const rawAssets = typeof bundle.assets === "object" && bundle.assets !== null ? bundle.assets : {};
  const keys = Object.keys(rawAssets);
  if (keys.length > MAX_BUNDLE_ASSETS) return { error: "too_large" };

  const decoded = new Map<string, LoadedAsset>();
  let total = 0;
  for (const key of keys) {
    const asset = rawAssets[key] as Partial<BundleAsset> | undefined;
    if (!asset || (asset.kind !== "image" && asset.kind !== "font")) return { error: "bad_asset" };
    const ext = String(asset.ext ?? "").toLowerCase();
    const allowed = asset.kind === "image" ? IMAGE_EXTENSIONS : FONT_UPLOAD_EXTENSIONS;
    if (!allowed.includes(ext)) return { error: "bad_asset" };
    if (typeof asset.b64 !== "string" || !BASE64.test(asset.b64)) return { error: "bad_asset" };
    const data = Buffer.from(asset.b64, "base64");
    total += data.length;
    if (total > MAX_BUNDLE_BYTES) return { error: "too_large" };
    decoded.set(key, { kind: asset.kind, ext, data });
  }

  const resolve = (ref: unknown, kind: "image" | "font"): LoadedAsset | null | "bad" => {
    if (typeof ref !== "string" || !ref.startsWith("asset:")) return null;
    const asset = decoded.get(ref.slice("asset:".length));
    return asset && asset.kind === kind ? asset : "bad";
  };
  const background = resolve(bundle.tokens.backgroundImage, "image");
  const font = resolve(bundle.tokens.customFontUrl, "font");
  if (background === "bad" || font === "bad") return { error: "bad_asset" };

  const buttons: ParsedBundle["buttons"] = [];
  for (const entry of Array.isArray(bundle.imageButtons) ? bundle.imageButtons : []) {
    const label = typeof entry?.label === "string" ? entry.label.trim() : "";
    const image = typeof entry?.asset === "string" ? decoded.get(entry.asset) : undefined;
    if (!label || !image || image.kind !== "image") return { error: "bad_asset" };
    buttons.push({ label, image });
  }

  return { tokens: { ...bundle.tokens, backgroundImage: null, customFontUrl: null }, background, font, buttons };
}
