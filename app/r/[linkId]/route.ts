import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { recordLinkClick } from "@/lib/db/analytics";
import { getReferrerHost, getDeviceType, getCountryFromHeaders } from "@/lib/analytics-capture";
import { getLinkHref } from "@/lib/link-render";
import type { PublicLink } from "@/lib/db/board";

// Semua klik link di halaman publik lewat sini dulu (bukan langsung ke URL asli) ->
// satu tempat buat nyatet analytics klik sebelum redirect ke tujuan sebenarnya. Ini
// alasan LinkCard nunjuk ke sini, bukan langsung ke href final (lihat lib/link-render.ts).
export async function GET(req: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;
  const id = Number(linkId);
  if (!Number.isFinite(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [link] = await db.select().from(links).where(eq(links.id, id)).limit(1);
  if (!link) {
    return new NextResponse("Not found", { status: 404 });
  }

  recordLinkClick(link.pageId, link.id, {
    referrer: getReferrerHost(req.headers.get("referer")),
    deviceType: getDeviceType(req.headers.get("user-agent")),
    country: getCountryFromHeaders(req.headers),
  });

  const publicLink: PublicLink = {
    id: link.id,
    title: link.title,
    url: link.url,
    description: link.description,
    thumbnailPath: link.thumbnailPath,
    displayStyle: link.displayStyle,
    icon: link.icon,
    linkType: link.linkType,
    featured: link.featured,
    utmSource: link.utmSource,
    utmMedium: link.utmMedium,
    utmCampaign: link.utmCampaign,
    iconPosition: link.iconPosition,
  };
  const { href } = getLinkHref(publicLink);
  // href bisa relatif ("/uploads/...") buat file upload sendiri -> resolve ke absolute
  // pakai origin request-nya, mailto:/tel: juga tetep valid lewat new URL().
  return NextResponse.redirect(new URL(href, req.url), { status: 302 });
}
