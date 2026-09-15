import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarShapeClass, getAvatarStyle, getTextShadowStyle, type ThemeTokens } from "@/lib/theme";
import type { ProfileData } from "@/lib/profile";

// Dipakai di halaman publik DAN preview dashboard -> satu sumber kebenaran buat avatar
// shape/border/shadow + banner, biar preview beneran representatif.
export function ThemeProfileHeader({
  theme,
  profile,
  fallbackName,
  // Banner pakai negative-margin buat "bleed" nembus padding parent-nya -> harus disetel
  // sesuai padding aktual parent (p-8=2rem di halaman publik, p-6=1.5rem di preview).
  bannerPaddingRem = 2,
}: {
  theme: ThemeTokens;
  profile: ProfileData;
  fallbackName: string;
  bannerPaddingRem?: number;
}) {
  const displayName = profile.displayName || fallbackName;

  return (
    <>
      {theme.profileShowBanner && profile.bannerPath ? (
        // eslint-disable-next-line @next/next/no-img-element -- gambar upload sendiri, sudah diproses jadi webp
        <img
          src={`/uploads/${profile.bannerPath}`}
          alt=""
          className="h-32 object-cover"
          style={{
            marginLeft: `-${bannerPaddingRem}rem`,
            marginRight: `-${bannerPaddingRem}rem`,
            marginTop: `-${bannerPaddingRem}rem`,
            // -3rem (48px) = setengah tinggi avatar sekarang (size-24 = 96px) -- avatar
            // numpuk PAS separuh badannya ke bagian bawah banner, sama kayak sebelumnya
            // waktu avatar masih size-20 (marginBottom -2.5rem = setengah dari 80px).
            marginBottom: "-3rem",
            width: `calc(100% + ${bannerPaddingRem * 2}rem)`,
          }}
        />
      ) : null}
      <div className="flex flex-col items-center gap-3">
        {profile.avatarPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- gambar upload sendiri, sudah diproses jadi webp
          <img
            src={`/uploads/${profile.avatarPath}`}
            alt=""
            className={cn("size-24 object-cover", getAvatarShapeClass(theme), theme.profileAvatarFloat && "kl-avatar-float")}
            style={getAvatarStyle(theme)}
          />
        ) : (
          <div
            className={cn(
              "flex size-24 items-center justify-center border text-2xl font-semibold",
              getAvatarShapeClass(theme),
              theme.profileAvatarFloat && "kl-avatar-float",
            )}
            style={{ ...getAvatarStyle(theme), borderColor: theme.cardBorder }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div
          className={cn(
            "flex flex-col items-center gap-1 text-center",
            theme.textBackdrop && "rounded-xl px-4 py-2.5",
          )}
          style={
            theme.textBackdrop
              ? { backgroundColor: theme.cardBackground, backdropFilter: "blur(8px)" }
              : undefined
          }
        >
          {/* Badge-nya `inline` + align, BUKAN h1 di-inline-flex -- inline-flex bikin isi h1
              diperlakukan sebagai satu unit flex, jadi nama panjang gak wrap per-kata dengan
              benar dan badge-nya bisa "loncat"/overflow di layar sempit. Dengan inline, badge
              ngalir bareng teks kayak karakter biasa. */}
          <h1 className="text-2xl font-semibold" style={getTextShadowStyle(theme)}>
            {displayName}
            {/* Warna biru fixed (bukan ikut warna theme) -- badge verified udah jadi konvensi
                visual lintas platform (Twitter/Instagram/dll), harus tetep kebaca "verified"
                di theme apa pun, bukan malah nyampur sama warna aksen theme. */}
            {profile.verifiedBadge ? (
              <BadgeCheck className="ml-1.5 inline size-5 shrink-0 align-[-0.15em] text-blue-500" strokeWidth={2.5} />
            ) : null}
          </h1>
          {profile.bio ? (
            <p className="whitespace-pre-line text-sm opacity-70" style={getTextShadowStyle(theme)}>
              {profile.bio}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
