import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, pages } from "@/lib/db/schema";
import { buildPublicPageMetadata, getBaseUrl } from "@/lib/public-page-meta";
import { getCampaignSource } from "@/lib/analytics-capture";
import { PublicPageBody } from "@/components/public-page-body";

// Sama kayak app/[slug]/page.tsx -- data bisa berubah kapan aja dari dashboard.
export const dynamic = "force-dynamic";

// Project ini single-user (lihat CLAUDE.md) -> cukup cari user mana pun yang punya
// primaryPageId ke-set, gak perlu tau "user mana" secara eksplisit.
async function getPrimaryPage() {
  const [row] = await db
    .select({ page: pages })
    .from(users)
    .innerJoin(pages, eq(users.primaryPageId, pages.id))
    .limit(1);
  return row?.page ?? null;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPrimaryPage();
  if (!page) return {};
  const baseUrl = await getBaseUrl();
  return buildPublicPageMetadata(page, baseUrl, "/");
}

// Kalau ada page yang di-set jadi "primary" (Settings -> Domain & Access di dashboard),
// domain root langsung nampilin page itu APA ADANYA, URL-nya tetep "/" (gak ada redirect
// ke "/${slug}"). Kalau belum ada yang di-set, balik ke behavior lama: redirect ke
// /dashboard (yang otomatis minta login sendiri kalau belum ada sesi).
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = await getPrimaryPage();
  if (!page) {
    redirect("/dashboard");
  }
  const campaignSource = getCampaignSource(await searchParams);
  return <PublicPageBody page={page} redirectTo="/" campaignSource={campaignSource} />;
}
