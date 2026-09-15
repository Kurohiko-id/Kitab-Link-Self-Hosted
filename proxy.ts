import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";

// Next.js 16 ganti nama "middleware.ts" -> "proxy.ts" (export function "proxy", bukan
// "middleware" lagi) -- proxy defaultnya jalan di Node.js runtime (bukan Edge), jadi
// better-sqlite3 (native binding, sync) aman dipakai langsung di sini.

// Admin/auth cuma boleh diakses lewat host yang BUKAN custom domain page (biasanya domain
// utama/IP server) -- kalau salah satu custom domain kena kompromise/salah konfig DNS-nya,
// itu gak otomatis buka akses ke dashboard. LinkBreeze sendiri (referensi arsitektur project
// ini) eksplisit netapin "Admin and auth stay on your main domain" buat fitur yang sama.
const ADMIN_PREFIXES = ["/dashboard", "/login", "/setup", "/api"];

function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// Cuma 2 sub-path publik yang beneran butuh di-rewrite ke bentuk berslug -- sisanya
// (/uploads/*, /r/*, /_next/*, dll) udah jalan APA ADANYA tanpa perlu tau domain custom-nya,
// gak boleh ke-prefix slug (bakal 404 kalau dipaksa).
function resolveSlugPath(pathname: string, slug: string): string | null {
  if (pathname === "/") return `/${slug}`;
  if (pathname === "/privacy") return `/${slug}/privacy`;
  return null;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (!host) return NextResponse.next();

  const [page] = await db
    .select({ id: pages.id, slug: pages.slug, domainVerified: pages.domainVerified })
    .from(pages)
    .where(and(eq(pages.domainType, "custom_domain"), eq(pages.domainValue, host)))
    .limit(1);

  if (!page) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isAdminPath(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Ke-hit sama sekali lewat host ini = bukti DNS + reverse proxy operator udah beneran
  // ngarah kesini -- tandain verified sekali doang (query berikutnya udah domainVerified
  // true, gak nulis ulang tiap request).
  if (!page.domainVerified) {
    await db.update(pages).set({ domainVerified: true }).where(eq(pages.id, page.id));
  }

  const rewritePath = resolveSlugPath(pathname, page.slug);
  if (!rewritePath) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = rewritePath;
  return NextResponse.rewrite(url);
}

export const config = {
  // uploads/r dikeluarin juga -- resolveSlugPath gak pernah nge-rewrite path itu (selalu
  // NextResponse.next() apa adanya), jadi query SQLite di proxy buat path itu percuma dan
  // kepanggil tiap gambar/redirect link dimuat. Verifikasi domain (domainVerified) tetep
  // ke-trigger normal dari request root "/" yang emang selalu ada di kunjungan page asli.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|uploads|r/).*)"],
};
