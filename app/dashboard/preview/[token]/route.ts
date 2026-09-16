import { NextResponse, type NextRequest } from "next/server";
import { verifyPreviewToken } from "@/lib/auth/preview-token";
import { createPreviewSession } from "@/lib/auth/session";

// Ini yang dibuka orang lain pas admin share link preview -- validasi token sekali di
// sini, abis itu dia jalan lewat cookie session (kitab_preview_session), bukan token di
// URL terus-terusan. Kalau token invalid/udah di-revoke, lempar ke /login apa adanya
// (gak ngasih tau "token salah" vs "gak ada" -- sama kayak /login gak bocorin akun ada
// apa nggak).
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await verifyPreviewToken(token);
  if (!result) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  await createPreviewSession(result.userId, result.tokenId);
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
