"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { pages, users } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/require-session";
import { createPageForUser, requireOwnedPage, RESERVED_SLUGS, SLUG_PATTERN } from "@/lib/db/pages";
import { hashPassword } from "@/lib/auth/password";
import { getDictionary, type Locale } from "@/lib/i18n";
import { parseProfileData } from "@/lib/profile";

export async function createPage(name: string, displayName?: string) {
  const session = await requireSession();
  const trimmed = name.trim();
  if (!trimmed) return null;

  const page = await createPageForUser(session.userId, trimmed);

  const trimmedDisplayName = displayName?.trim();
  if (trimmedDisplayName) {
    const profile = parseProfileData(page.profileJson);
    await db
      .update(pages)
      .set({ profileJson: JSON.stringify({ ...profile, displayName: trimmedDisplayName.slice(0, 100) }) })
      .where(eq(pages.id, page.id));
  }

  revalidatePath("/dashboard");
  return page;
}

export type ChangeSlugState = { error?: string } | undefined;

export async function changeSlugAction(
  locale: Locale,
  pageId: number,
  _prevState: ChangeSlugState,
  formData: FormData,
): Promise<ChangeSlugState> {
  const t = getDictionary(locale);
  await requireOwnedPage(pageId);
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    return { error: t.settings.slugInvalidError };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { error: t.settings.slugReservedError };
  }

  const [taken] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).limit(1);
  if (taken && taken.id !== pageId) {
    return { error: t.settings.slugTakenError };
  }

  await db.update(pages).set({ slug }).where(eq(pages.id, pageId));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
  return {};
}

export async function setPagePassword(pageId: number, formData: FormData) {
  await requireOwnedPage(pageId);
  const password = String(formData.get("password") ?? "");

  const passwordHash = password ? await hashPassword(password) : null;
  await db.update(pages).set({ passwordHash }).where(eq(pages.id, pageId));

  revalidatePath("/dashboard");
}

// Hapus page -> cascade ke links/link_groups/themes/analytics_events/scheduled_rules/
// api_tokens/webhooks lewat onDelete: "cascade" di schema, gak perlu hapus manual satu-satu.
export async function deletePageAction(locale: Locale, pageId: number): Promise<{ error?: string }> {
  const t = getDictionary(locale);
  const session = await requireSession();
  await requireOwnedPage(pageId);

  const userPages = await db.select({ id: pages.id }).from(pages).where(eq(pages.userId, session.userId));
  if (userPages.length <= 1) {
    return { error: t.settings.deletePageLastError };
  }

  // users.primaryPageId -> pages.id sengaja gak punya ON DELETE SET NULL yang beneran
  // kepasang di SQLite (keterbatasan drizzle-kit buat ALTER TABLE ADD COLUMN + inline FK),
  // jadi harus dibersihin manual dulu di sini -- kalau enggak, delete page yang lagi jadi
  // primary bakal kena FK constraint error (foreign_keys=ON di lib/db/index.ts).
  await db
    .update(users)
    .set({ primaryPageId: null })
    .where(and(eq(users.id, session.userId), eq(users.primaryPageId, pageId)));

  await db.delete(pages).where(eq(pages.id, pageId));
  revalidatePath("/dashboard");
  revalidatePath("/");
  return {};
}

// Page yang dipilih tampil di domain root ("/", tanpa slug) -- null = balik ke behavior
// default (redirect ke /dashboard, lihat app/page.tsx).
export async function setPrimaryPageAction(pageId: number | null) {
  const session = await requireSession();
  if (pageId !== null) await requireOwnedPage(pageId);

  await db.update(users).set({ primaryPageId: pageId }).where(eq(users.id, session.userId));
  revalidatePath("/dashboard");
  revalidatePath("/");
}

// Hostname biasa, boleh ada subdomain (links.contoh.com) -- sengaja gak terima skema/path
// (https://, /apapun) atau spasi, itu kesalahan input paling umum orang copy-paste dari
// browser. proxy.ts yang beneran pakai kolom ini buat host-based routing.
const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

export type SetCustomDomainState = { error?: string } | undefined;

export async function setCustomDomainAction(
  locale: Locale,
  pageId: number,
  _prevState: SetCustomDomainState,
  formData: FormData,
): Promise<SetCustomDomainState> {
  const t = getDictionary(locale);
  await requireOwnedPage(pageId);
  const domain = String(formData.get("domain") ?? "").trim().toLowerCase();

  if (!domain) {
    // Kosong -> lepas domain custom, balik ke subpath biasa.
    await db.update(pages).set({ domainType: "subpath", domainValue: null, domainVerified: false }).where(eq(pages.id, pageId));
    revalidatePath("/dashboard");
    return {};
  }

  if (!DOMAIN_PATTERN.test(domain)) {
    return { error: t.domain.invalidDomainError };
  }

  const [taken] = await db.select({ id: pages.id }).from(pages).where(eq(pages.domainValue, domain)).limit(1);
  if (taken && taken.id !== pageId) {
    return { error: t.domain.domainTakenError };
  }

  // Ganti domain -> domainVerified reset ke false, harus ke-hit ulang lewat domain baru
  // buat ke-tandain verified lagi (lihat proxy.ts).
  await db.update(pages).set({ domainType: "custom_domain", domainValue: domain, domainVerified: false }).where(eq(pages.id, pageId));
  revalidatePath("/dashboard");
  return {};
}
