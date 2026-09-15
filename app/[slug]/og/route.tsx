import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { parseProfileData } from "@/lib/profile";
import { getThemeForPage } from "@/lib/db/theme";
import { resolveUploadPath } from "@/lib/images/storage";

export const contentType = "image/png";
const SIZE = { width: 1200, height: 630 };

// Fallback OG image kalau user gak upload custom sendiri (lihat generateMetadata di
// app/[slug]/page.tsx) — pakai warna+font theme page-nya sendiri biar konsisten,
// bukan template generic. File terpisah dari nama spesial "opengraph-image" Next.js
// SENGAJA, biar generateMetadata bisa selalu explicit nentuin custom vs auto tanpa
// gantungin ke aturan precedence otomatis Next yang gak terlalu transparan.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);

  if (!page) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 48, background: "#18181b", color: "#fff" }}>
          Kitab Link
        </div>
      ),
      SIZE,
    );
  }

  const [profile, theme] = await Promise.all([parseProfileData(page.profileJson), getThemeForPage(page.id)]);
  const displayName = profile.displayName || slug;

  let avatarSrc: string | null = null;
  if (profile.avatarPath) {
    try {
      const webpBuffer = await readFile(resolveUploadPath(profile.avatarPath));
      // Satori (mesin di balik ImageResponse) gak support format WebP -- semua upload di
      // project ini WAJIB WebP (lihat CLAUDE.md), jadi selalu dikonversi ke PNG di sini
      // dulu sebelum di-embed, atau OG image gagal generate total.
      const pngBuffer = await sharp(webpBuffer).png().toBuffer();
      avatarSrc = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    } catch {
      // File avatar gak ketemu/rusak — lanjut tanpa avatar, jangan sampai gagal generate gambar.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.backgroundColors[0] ?? "#fafafa",
          color: theme.text,
          padding: 64,
        }}
      >
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) butuh <img> mentah, bukan next/image
          <img
            src={avatarSrc}
            alt=""
            width={160}
            height={160}
            style={{ borderRadius: "50%", objectFit: "cover", marginBottom: 32, border: `4px solid ${theme.cardBorder}` }}
          />
        ) : null}
        <div style={{ fontSize: 56, fontWeight: 700, textAlign: "center" }}>{displayName}</div>
        {profile.bio ? (
          <div style={{ fontSize: 28, marginTop: 16, opacity: 0.75, textAlign: "center", maxWidth: 960 }}>{profile.bio}</div>
        ) : null}
      </div>
    ),
    SIZE,
  );
}
