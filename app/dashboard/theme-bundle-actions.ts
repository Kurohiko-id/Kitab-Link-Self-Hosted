"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireSession } from "@/lib/auth/require-session";
import { listImageButtons } from "@/lib/db/image-buttons";
import { resolveUploadPath } from "@/lib/images/storage";
import { parseThemeTokens, type ThemeTokens } from "@/lib/theme";
import { buildBundle, isSafeUploadPath, type LoadedAsset } from "@/lib/theme-bundle";

// File yang udah hilang dari disk dilewati (null), export gak boleh gagal gara-gara itu.
async function loadAsset(kind: "image" | "font", relativePath: string | null): Promise<LoadedAsset | null> {
  if (!relativePath || !isSafeUploadPath(relativePath)) return null;
  try {
    const data = await readFile(resolveUploadPath(relativePath));
    const ext = path.extname(relativePath).slice(1).toLowerCase();
    return { kind, ext, data };
  } catch {
    return null;
  }
}

// tokens datang dari state editor (termasuk yang belum disimpan) -- sama kayak export
// lama yang cuma stringify state client. buttonIds di-filter ke milik user sendiri.
export async function exportThemeBundleAction(
  tokens: ThemeTokens,
  buttonIds: number[],
): Promise<{ json: string } | { error: string }> {
  const session = await requireSession();
  const safeTokens = parseThemeTokens(JSON.stringify(tokens));
  const mine = await listImageButtons(session.userId);
  const chosen = mine.filter((b) => buttonIds.includes(b.id));

  const buttons: { label: string; image: LoadedAsset }[] = [];
  for (const button of chosen) {
    const image = await loadAsset("image", button.path);
    if (image) buttons.push({ label: button.label, image });
  }
  const bundle = buildBundle({
    tokens: safeTokens,
    background: await loadAsset("image", safeTokens.backgroundImage),
    font: await loadAsset("font", safeTokens.customFontUrl),
    buttons,
  });
  return { json: JSON.stringify(bundle) };
}
