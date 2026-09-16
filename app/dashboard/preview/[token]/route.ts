import { NextResponse } from "next/server";
import { verifyPreviewToken } from "@/lib/auth/preview-token";
import { createPreviewSession } from "@/lib/auth/session";
import { getBaseUrl } from "@/lib/public-page-meta";

// Ini yang dibuka orang lain pas admin share link preview -- validasi token sekali di
// sini, abis itu dia jalan lewat cookie session (kitab_preview_session), bukan token di
// URL terus-terusan. Kalau token invalid/udah di-revoke, lempar ke /login apa adanya
// (gak ngasih tau "token salah" vs "gak ada" -- sama kayak /login gak bocorin akun ada
// apa nggak).
//
// getBaseUrl() (bukan req.url) -- di belakang reverse proxy (Caddy), req.url standalone
// server bisa balik ke HOSTNAME/PORT container sendiri (0.0.0.0:3000) alih-alih domain
// asli yang diakses browser. getBaseUrl() baca header Host request beneran (proven, udah
// dipakai buat OG image/canonical URL halaman publik).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const base = await getBaseUrl();

  const result = await verifyPreviewToken(token);
  if (!result) {
    return NextResponse.redirect(new URL("/login", base));
  }

  await createPreviewSession(result.userId, result.tokenId);
  return NextResponse.redirect(new URL("/dashboard", base));
}
