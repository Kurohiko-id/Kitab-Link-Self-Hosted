import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { pages, users } from "@/lib/db/schema";
import { parseProfileData } from "@/lib/profile";

// Host-nya bisa apa aja (subpath/subdomain/custom domain, sama alasannya kayak
// getBaseUrl() di lib/public-page-meta.ts) -- gak dipanggil langsung karena itu butuh
// canonicalPath, di sini cukup host+proto mentah.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const baseUrl = `${proto}://${host}`;

  const [user] = await db.select({ primaryPageId: users.primaryPageId }).from(users).limit(1);
  const allPages = await db
    .select({ id: pages.id, slug: pages.slug, passwordHash: pages.passwordHash, profileJson: pages.profileJson, createdAt: pages.createdAt })
    .from(pages);

  return allPages
    // Password-protected & noIndex-flagged page emang gak dimaksudin buat publik/ke-index.
    .filter((p) => !p.passwordHash && !parseProfileData(p.profileJson).noIndex)
    .map((p) => ({
      // Page yang di-set jadi primary cuma boleh muncul lewat "/" -- sama kayak canonical
      // di buildPublicPageMetadata, biar gak dianggep duplicate content sama "/${slug}".
      url: p.id === user?.primaryPageId ? baseUrl : `${baseUrl}/${p.slug}`,
      lastModified: p.createdAt,
    }));
}
