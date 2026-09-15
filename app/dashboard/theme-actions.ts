"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { pages, themes } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import { requireOwnedTheme } from "@/lib/db/theme";
import { requireSession } from "@/lib/auth/require-session";
import { parseThemeTokens, type ThemeTokens } from "@/lib/theme";
import { buildThemeTokensFromForm } from "@/lib/theme-form";

async function uniqueThemeName(userId: number, base: string): Promise<string> {
  const existing = await db.select({ name: themes.name }).from(themes).where(eq(themes.userId, userId));
  const names = new Set(existing.map((row) => row.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}

// Klik preset di gallery -> langsung jadi entry baru di library user (gak pernah edit
// definisi preset itu sendiri), sekaligus diaktifkan buat page yang lagi dibuka.
export async function duplicateThemeAction(pageId: number, sourceTokens: ThemeTokens, sourceName: string) {
  const page = await requireOwnedPage(pageId);
  const name = await uniqueThemeName(page.userId, `${sourceName} (copy)`);
  const [created] = await db
    .insert(themes)
    .values({ userId: page.userId, name, tokensJson: JSON.stringify(sourceTokens) })
    .returning();
  await db.update(pages).set({ themeId: created.id }).where(eq(pages.id, pageId));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
  return created;
}

export async function setActiveThemeAction(pageId: number, themeId: number) {
  const page = await requireOwnedPage(pageId);
  await requireOwnedTheme(page.userId, themeId);
  await db.update(pages).set({ themeId }).where(eq(pages.id, pageId));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
}

export async function saveThemeAction(themeId: number, formData: FormData) {
  const session = await requireSession();
  const existing = await requireOwnedTheme(session.userId, themeId);
  const current = parseThemeTokens(existing.tokensJson);

  const next = await buildThemeTokensFromForm(current, formData);
  const name = String(formData.get("name") ?? "").trim() || existing.name;

  await db.update(themes).set({ name, tokensJson: JSON.stringify(next) }).where(eq(themes.id, themeId));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
}

export async function deleteThemeLibraryAction(themeId: number) {
  const session = await requireSession();
  await requireOwnedTheme(session.userId, themeId);
  await db.delete(themes).where(eq(themes.id, themeId));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
}

export type ImportThemeResult = { error: "empty" | "invalid_json" | "wrong_format" } | { error?: undefined };

export async function importThemeAction(pageId: number, formData: FormData): Promise<ImportThemeResult> {
  const page = await requireOwnedPage(pageId);

  let raw = String(formData.get("json") ?? "");
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    raw = await file.text();
  }
  if (!raw.trim()) return { error: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "invalid_json" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { error: "wrong_format" };

  const next = parseThemeTokens(JSON.stringify(parsed));
  const name = await uniqueThemeName(page.userId, "Imported theme");
  const [created] = await db
    .insert(themes)
    .values({ userId: page.userId, name, tokensJson: JSON.stringify(next) })
    .returning();
  await db.update(pages).set({ themeId: created.id }).where(eq(pages.id, pageId));

  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
  return {};
}
