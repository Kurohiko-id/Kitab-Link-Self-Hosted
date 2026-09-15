import { headers } from "next/headers";
import type { Metadata } from "next";
import { parseProfileData } from "@/lib/profile";

// Domain-nya bisa apa aja (subpath/subdomain/custom domain, lihat CLAUDE.md) -> base URL
// buat og:image diambil dari header request yang bener-bener kepakai, BUKAN env var
// statis (sesuai prinsip "konfigurasi dari dashboard, bukan .env"). Dipakai bareng sama
// app/[slug]/page.tsx dan app/page.tsx (root, buat page yang di-set jadi primary).
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

// `canonicalPath` WAJIB diisi caller (bukan didefaultin ke "/"+slug di sini) -- kalau page
// ini juga di-set jadi primary page (users.primaryPageId), dia bisa diakses dari DUA URL
// ("/" dan "/${slug}") yang render PERSIS SAMA -> tanpa canonical yang konsisten di
// keduanya, itu duplicate content di mata search engine. Caller yang nentuin mana yang
// "asli" (lihat app/[slug]/page.tsx dan app/page.tsx).
export function buildPublicPageMetadata(
  page: { slug: string; profileJson: string },
  baseUrl: string,
  canonicalPath: string,
): Metadata {
  const profile = parseProfileData(page.profileJson);
  const title = profile.seoTitle || profile.displayName || `@${page.slug}`;
  const description = profile.seoDescription || profile.bio || `Link-in-bio page for @${page.slug}`;
  const imageUrl = profile.ogImagePath ? `${baseUrl}/uploads/${profile.ogImagePath}` : `${baseUrl}/${page.slug}/og`;

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}${canonicalPath}` },
    icons: profile.faviconPath ? { icon: `${baseUrl}/uploads/${profile.faviconPath}` } : undefined,
    robots: profile.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
