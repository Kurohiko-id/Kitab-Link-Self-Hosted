import { headers } from "next/headers";
import { getPublicBoardData } from "@/lib/db/board";
import { getThemeForPage } from "@/lib/db/theme";
import {
  getAnimatedBackgroundClass,
  getCustomFontFaceCSS,
  getPageBackgroundStyle,
  getTextureOverlayClass,
  getTextureOverlayStyle,
  getTypographyStyle,
} from "@/lib/theme";
import { parseProfileData } from "@/lib/profile";
import { splitIconLinks } from "@/lib/link-render";
import { recordPageView } from "@/lib/db/analytics";
import { getReferrerHost, getDeviceType, getCountryFromHeaders } from "@/lib/analytics-capture";
import { hasPageAccess } from "@/lib/auth/page-session";
import { getActiveLiveStatus } from "@/lib/db/live-status";
import { detectVisitorLocale, getPublicDictionary } from "@/lib/public-i18n";
import { KITABLINK_SITE_URL } from "@/lib/version";
import { LinkCard } from "@/components/link-card";
import { GroupContainer } from "@/components/group-container";
import { SocialIconRow } from "@/components/social-icon-row";
import { NetworkBackground } from "@/components/network-background";
import { ThemeProfileHeader } from "@/components/theme-profile-header";
import { LiveBadge } from "@/components/live-badge";
import { PasswordForm } from "@/app/[slug]/password-form";

export type PublicPageRow = { id: number; slug: string; profileJson: string; passwordHash: string | null };

// Isi lengkap halaman publik (password gate, catat page view, fetch board+theme, render
// semua link+background+footer) -- dipakai bareng oleh app/[slug]/page.tsx (URL biasa)
// DAN app/page.tsx (domain root, kalau ada page yang di-set jadi "primary", lihat
// users.primaryPageId). `redirectTo` nentuin balik ke mana abis password bener: "/${slug}"
// dari rute biasa, "/" dari root -- biar slug gak nongol di URL kalau lagi di root.
// `campaignSource` = query param ?utm_source= atau ?ref= dari URL yang dibagiin (mis. link
// khusus buat bio Instagram vs TikTok) -- diutamain di atas Referer header karena in-app
// browser (Instagram/TikTok) sering gak ngirim Referer sama sekali.
export async function PublicPageBody({
  page,
  redirectTo,
  campaignSource,
}: {
  page: PublicPageRow;
  redirectTo: string;
  campaignSource?: string | null;
}) {
  const requestHeaders = await headers();
  // Bahasa dari browser PENGUNJUNG (Accept-Language), bukan dari setting akun pemilik
  // page -- lihat lib/public-i18n.ts. Cuma buat string UI kecil yang genuinely hardcode
  // (badge live, toast copy, dll), bukan konten yang diisi user sendiri.
  // Dipindah ke atas password-gate (sebelumnya dihitung setelah return early) -- PasswordForm
  // butuh locale ini juga, kalau enggak halaman password-protect SELALU Indonesia
  // apapun bahasa browser pengunjungnya.
  const visitorLocale = detectVisitorLocale(requestHeaders.get("accept-language"));
  const pt = getPublicDictionary(visitorLocale);

  if (page.passwordHash && !(await hasPageAccess(page.id))) {
    return <PasswordForm pageId={page.id} redirectTo={redirectTo} locale={visitorLocale} />;
  }

  recordPageView(page.id, {
    referrer: campaignSource || getReferrerHost(requestHeaders.get("referer")),
    deviceType: getDeviceType(requestHeaders.get("user-agent")),
    country: getCountryFromHeaders(requestHeaders),
  });

  const [board, theme, liveStatus] = await Promise.all([
    getPublicBoardData(page.id),
    getThemeForPage(page.id),
    getActiveLiveStatus(page.id),
  ]);
  const { topIconLinks, bottomIconLinks, ungrouped, groups } = splitIconLinks(board.ungrouped, board.groups);
  const hasAnyLink = ungrouped.length > 0 || groups.some((group) => group.links.length > 0);
  const isAurora = theme.backgroundType === "aurora";
  const isNetwork = theme.backgroundType === "network";
  const customFontFace = getCustomFontFaceCSS(theme);
  const profile = parseProfileData(page.profileJson);
  const textureOverlayStyle = getTextureOverlayStyle(theme);
  const textureOverlayClass = getTextureOverlayClass(theme);

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col items-center overflow-hidden ${getAnimatedBackgroundClass(theme) ?? ""}`}
      style={{ ...getPageBackgroundStyle(theme), ...getTypographyStyle(theme), color: theme.text }}
    >
      {customFontFace ? <style dangerouslySetInnerHTML={{ __html: customFontFace }} /> : null}
      {/* CSS punya page owner sendiri buat page-nya sendiri (diisi dari tab Settings ->
          Custom CSS), bukan input dari pengunjung -> aman di-inject apa adanya. */}
      {profile.customCss ? <style dangerouslySetInnerHTML={{ __html: profile.customCss }} /> : null}
      {isAurora ? (
        <>
          <div
            className="kl-aurora-blob-1 pointer-events-none absolute -left-1/3 top-0 size-[32rem] rounded-full opacity-50 blur-3xl"
            style={{ backgroundColor: theme.backgroundColors[1] ?? "#7c5cff" }}
          />
          <div
            className="kl-aurora-blob-2 pointer-events-none absolute -right-1/3 bottom-0 size-[32rem] rounded-full opacity-40 blur-3xl"
            style={{ backgroundColor: theme.backgroundColors[2] ?? theme.backgroundColors[1] ?? "#22d3ee" }}
          />
        </>
      ) : null}
      {isNetwork ? <NetworkBackground colors={theme.backgroundColors} /> : null}

      <div
        className="relative z-10 mx-auto flex w-full flex-col items-center p-8"
        style={{ maxWidth: `${theme.containerWidth}px` }}
      >
        <ThemeProfileHeader theme={theme} profile={profile} fallbackName={page.slug} bannerPaddingRem={2} />

        {profile.socialIconsShowTop ? (
          <div className="mt-4 w-full">
            <SocialIconRow links={topIconLinks} theme={theme} />
          </div>
        ) : null}

        {liveStatus ? (
          <div className="mt-4 w-full">
            <LiveBadge
              name={liveStatus.label || profile.displayName || page.slug}
              videoUrl={liveStatus.videoUrl}
              locale={visitorLocale}
            />
          </div>
        ) : null}

        <div className="mt-6 flex w-full flex-col gap-4">
          {!hasAnyLink && <p className="text-center text-sm opacity-70">{pt.noLinksYet}</p>}

          {(() => {
            // Counter global (bukan per-group) biar stagger animasi kemunculan lanjut
            // urut dari atas ke bawah halaman, bukan reset tiap group. Server Component
            // ini render sekali per request, jadi mutable counter di sini aman.
            let cardIndex = 0;
            return (
              <>
                {ungrouped.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {ungrouped.map((link) => (
                      <LinkCard key={link.id} link={link} theme={theme} index={cardIndex++} locale={visitorLocale} />
                    ))}
                  </div>
                )}

                {groups.map((group) =>
                  group.links.length > 0 ? (
                    <GroupContainer key={group.id} name={group.name} theme={theme}>
                      {group.links.map((link) => (
                        <LinkCard key={link.id} link={link} theme={theme} index={cardIndex++} locale={visitorLocale} />
                      ))}
                    </GroupContainer>
                  ) : null,
                )}
              </>
            );
          })()}
        </div>

        {profile.socialIconsShowBottom ? (
          <div className="mt-6 w-full">
            <SocialIconRow links={bottomIconLinks} theme={theme} />
          </div>
        ) : null}

        {profile.footerText || profile.privacyPolicyContent || profile.watermarkEnabled ? (
          <div className="mt-8 flex flex-col items-center gap-1 text-center text-xs opacity-60">
            {profile.footerText ? <p className="whitespace-pre-line">{profile.footerText}</p> : null}
            {profile.privacyPolicyContent ? (
              <a href={`/${page.slug}/privacy`} className="underline">
                {pt.privacyPolicy}
              </a>
            ) : null}
            {profile.watermarkEnabled ? (
              <a href={KITABLINK_SITE_URL} target="_blank" rel="noopener noreferrer">
                {pt.poweredBy}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      {textureOverlayStyle ? <div style={textureOverlayStyle} /> : null}
      {textureOverlayClass ? <div className={textureOverlayClass} style={{ opacity: theme.textureOpacity }} /> : null}
    </div>
  );
}
