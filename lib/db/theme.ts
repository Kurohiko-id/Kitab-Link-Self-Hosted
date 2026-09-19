import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { pages, themes } from "./schema";
import { parseThemeTokens, type ThemeTokens } from "@/lib/theme";

export async function getThemeForPage(pageId: number): Promise<ThemeTokens> {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page?.themeId) return parseThemeTokens(null);

  const [theme] = await db.select().from(themes).where(eq(themes.id, page.themeId)).limit(1);
  return parseThemeTokens(theme?.tokensJson);
}

export async function getThemeLibrary(userId: number) {
  return db.select().from(themes).where(eq(themes.userId, userId)).orderBy(desc(themes.createdAt));
}

// Server actions harus panggil ini sebelum ubah/hapus theme milik user lain.
export async function requireOwnedTheme(userId: number, themeId: number) {
  const [theme] = await db
    .select()
    .from(themes)
    .where(and(eq(themes.id, themeId), eq(themes.userId, userId)))
    .limit(1);
  if (!theme) throw new Error("Theme tidak ditemukan atau bukan milik Anda.");
  return theme;
}

// Dipakai theme-actions.ts (import theme tunggal) & backup-actions.ts (import backup
// gabungan) -- keduanya bikin entry library baru dari nama yang sama, jangan diduplikasi.
export async function uniqueThemeName(userId: number, base: string): Promise<string> {
  const existing = await db.select({ name: themes.name }).from(themes).where(eq(themes.userId, userId));
  const names = new Set(existing.map((row) => row.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}
