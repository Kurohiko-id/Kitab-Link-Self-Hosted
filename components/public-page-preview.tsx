import {
  getAnimatedBackgroundClass,
  getCustomFontFaceCSS,
  getPageBackgroundStyle,
  getTextureOverlayClass,
  getTextureOverlayStyle,
  getTypographyStyle,
  type ThemeTokens,
} from "@/lib/theme";
import type { ProfileData } from "@/lib/profile";
import type { PublicBoardData, PublicLink } from "@/lib/db/board";
import { splitIconLinks } from "@/lib/link-render";
import { LinkCard } from "@/components/link-card";
import { NetworkBackground } from "@/components/network-background";
import { ThemeProfileHeader } from "@/components/theme-profile-header";
import { GroupContainer } from "@/components/group-container";
import { SocialIconRow } from "@/components/social-icon-row";
import { cn } from "@/lib/utils";

// Contoh isi kalau page beneran belum punya link sama sekali -> preview tetep kerasa
// "hidup" (bukan kotak kosong) tanpa harus nunggu user isi link dulu.
const PLACEHOLDER_LINK_BASE = {
  description: null,
  thumbnailPath: null,
  imageHideBorder: false,
  imageHideBackground: false,
  imageRadius: null,
  imageShadow: "theme" as const,
  displayStyle: "pill" as const,
  icon: null,
  linkType: "url" as const,
  featured: false,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  iconPosition: "top" as const,
};
const PLACEHOLDER_LINKS: PublicLink[] = [
  { ...PLACEHOLDER_LINK_BASE, id: -1, title: "Example Link", url: "https://example.com" },
  { ...PLACEHOLDER_LINK_BASE, id: -2, title: "Another Link", url: "https://example.com" },
];

export function PublicPagePreview({
  tokens,
  profile,
  fallbackName,
  previewBoard,
  className,
}: {
  tokens: ThemeTokens;
  profile: ProfileData;
  fallbackName: string;
  previewBoard: PublicBoardData;
  className?: string;
}) {
  const isAurora = tokens.backgroundType === "aurora";
  const isNetwork = tokens.backgroundType === "network";
  const customFontFace = getCustomFontFaceCSS(tokens);
  const textureOverlayStyle = getTextureOverlayStyle(tokens);
  const textureOverlayClass = getTextureOverlayClass(tokens);
  const hasAnyRealLink =
    previewBoard.ungrouped.length > 0 || previewBoard.groups.some((group) => group.links.length > 0);
  const { topIconLinks, bottomIconLinks, ungrouped, groups } = splitIconLinks(
    hasAnyRealLink ? previewBoard.ungrouped : PLACEHOLDER_LINKS,
    hasAnyRealLink ? previewBoard.groups : [],
  );

  return (
    <>
      {customFontFace ? <style dangerouslySetInnerHTML={{ __html: customFontFace }} /> : null}
      <div
        className={cn(
          "relative flex flex-col items-center gap-3 overflow-y-auto overflow-x-hidden p-6",
          getAnimatedBackgroundClass(tokens),
          className,
        )}
        style={{ ...getPageBackgroundStyle(tokens), ...getTypographyStyle(tokens), color: tokens.text }}
      >
        {isAurora ? (
          <>
            <div
              className="kl-aurora-blob-1 absolute -top-0 -left-1/4 size-72 rounded-full opacity-50 blur-3xl"
              style={{ backgroundColor: tokens.backgroundColors[1] ?? "#7c5cff" }}
            />
            <div
              className="kl-aurora-blob-2 absolute -right-1/4 bottom-0 size-72 rounded-full opacity-40 blur-3xl"
              style={{ backgroundColor: tokens.backgroundColors[2] ?? tokens.backgroundColors[1] ?? "#22d3ee" }}
            />
          </>
        ) : null}
        {isNetwork ? <NetworkBackground colors={tokens.backgroundColors} /> : null}
        <div className="relative z-10 flex w-full flex-col items-center">
          <ThemeProfileHeader theme={tokens} profile={profile} fallbackName={fallbackName} bannerPaddingRem={1.5} />

          {profile.socialIconsShowTop ? (
            <div className="mt-3 w-full">
              <SocialIconRow links={topIconLinks} theme={tokens} />
            </div>
          ) : null}

          <div className="mt-4 flex w-full flex-col gap-3">
            {(() => {
              let cardIndex = 0;
              return (
                <>
                  {ungrouped.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {ungrouped.map((link) => (
                        <LinkCard key={link.id} link={link} theme={tokens} index={cardIndex++} />
                      ))}
                    </div>
                  )}
                  {groups.map((group) =>
                    group.links.length > 0 ? (
                      <GroupContainer key={group.id} name={group.name} theme={tokens}>
                        {group.links.map((link) => (
                          <LinkCard key={link.id} link={link} theme={tokens} index={cardIndex++} />
                        ))}
                      </GroupContainer>
                    ) : null,
                  )}
                </>
              );
            })()}
          </div>

          {profile.socialIconsShowBottom ? (
            <div className="mt-4 w-full">
              <SocialIconRow links={bottomIconLinks} theme={tokens} />
            </div>
          ) : null}
        </div>
        {textureOverlayStyle ? <div style={textureOverlayStyle} /> : null}
        {textureOverlayClass ? <div className={textureOverlayClass} style={{ opacity: tokens.textureOpacity }} /> : null}
      </div>
    </>
  );
}
