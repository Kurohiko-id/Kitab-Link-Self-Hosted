import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { pages } from "./schema";
import { requireSession } from "@/lib/auth/require-session";

// Top-level route di app/ -- kalau slug page persis sama, page-nya ke-shadow permanen
// sama route asli (gak akan pernah keload). "r" dan "uploads" juga app-level route
// (app/r/[linkId], app/uploads/[...path]). Exported -- dipake juga buat validasi ganti
// slug manual di page-actions.ts (changeSlugAction), bukan cuma auto-slugify di sini.
export const RESERVED_SLUGS = new Set(["login", "setup", "dashboard", "api", "r", "uploads"]);

// Sama persis sama hasil auto-slugify createPageForUser (lowercase, a-z0-9, dash pemisah,
// gak boleh dash di ujung) -- dipake buat validasi input MANUAL (changeSlugAction), beda
// dari auto-slugify yang otomatis "membersihkan" karakter aneh, input manual harus udah bersih.
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function getOrCreateDefaultPage(userId: number) {
  const [existing] = await db.select().from(pages).where(eq(pages.userId, userId)).limit(1);
  if (existing) return existing;

  let slug = "main";
  const [taken] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (taken) slug = `page-${userId}`;

  const [created] = await db.insert(pages).values({ userId, slug }).returning();
  return created;
}

export async function getPagesForUser(userId: number) {
  return db.select().from(pages).where(eq(pages.userId, userId)).orderBy(pages.id);
}

async function findAvailableSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (true) {
    const [taken] = RESERVED_SLUGS.has(slug) ? [true] : await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
    if (!taken) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function createPageForUser(userId: number, name: string) {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page";

  const slug = await findAvailableSlug(base);
  const [created] = await db.insert(pages).values({ userId, slug }).returning();
  return created;
}

// Server actions harus panggil ini sebelum menyentuh data milik sebuah page,
// biar user tidak bisa modifikasi page milik user lain.
export async function requireOwnedPage(pageId: number) {
  const session = await requireSession();
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, session.userId)))
    .limit(1);

  if (!page) {
    throw new Error("Page tidak ditemukan atau bukan milik Anda.");
  }
  return page;
}
