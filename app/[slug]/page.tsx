import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, users } from "@/lib/db/schema";
import { buildPublicPageMetadata, getBaseUrl } from "@/lib/public-page-meta";
import { getCampaignSource } from "@/lib/analytics-capture";
import { PublicPageBody } from "@/components/public-page-body";

// Data page (visibility/active/theme) bisa berubah dari dashboard kapan saja,
// jadi halaman ini tidak boleh di-cache statis.
export const dynamic = "force-dynamic";

// Page yang di-set jadi primary bisa diakses dari "/" DAN "/${slug}" (render sama persis,
// lihat users.primaryPageId) -- canonical-nya harus konsisten nunjuk ke "/" di kedua rute
// itu, bukan ke dirinya sendiri, biar gak dianggap duplicate content sama search engine.
async function resolveCanonicalPath(pageId: number, slug: string): Promise<string> {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.primaryPageId, pageId)).limit(1);
  return row ? "/" : `/${slug}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!page) return {};

  const baseUrl = await getBaseUrl();
  const canonicalPath = await resolveCanonicalPath(page.id, slug);
  return buildPublicPageMetadata(page, baseUrl, canonicalPath);
}

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);

  if (!page) {
    notFound();
  }

  const campaignSource = getCampaignSource(await searchParams);
  return <PublicPageBody page={page} redirectTo={`/${slug}`} campaignSource={campaignSource} />;
}
