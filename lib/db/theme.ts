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
