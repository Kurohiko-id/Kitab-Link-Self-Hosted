import { Info, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseProfileData } from "@/lib/profile";
import type { Dictionary } from "@/lib/i18n";
import type { ThemeTokens } from "@/lib/theme";
import type { PublicBoardData } from "@/lib/db/board";
import { DashboardPreviewPanel } from "@/components/dashboard-preview-panel";
import { ActionForm } from "@/components/action-form";
import { SocialLinksManager } from "@/components/social-links-manager";
import { saveProfileAction } from "./settings-actions";
import type { SocialLinksByPosition } from "./social-links-actions";
import { SectionCard } from "./section-card";

// Dulu tab "Profile" di dalam Settings, dipindah jadi menu sendiri di sidebar (di bawah
// Links & Groups) atas permintaan user -- form/action-nya sama persis, cuma lokasinya pindah
// dan sekarang ditemenin live preview kayak tab Links & Groups.
const FILE_INPUT_CLASS =
  "text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground";

export function ProfileEditor({
  page,
  tokens,
  previewBoard,
  socialLinks,
  t,
}: {
  page: { id: number; slug: string; profileJson: string };
  tokens: ThemeTokens;
  previewBoard: PublicBoardData;
  socialLinks: SocialLinksByPosition;
  t: Dictionary;
}) {
  const profile = parseProfileData(page.profileJson);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 pb-12">
        <SectionCard title={t.settings.profileTitle} description={t.settings.profileDesc}>
          <ActionForm errorMessage={t.common.saveFailed} action={saveProfileAction.bind(null, page.id)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">{t.settings.displayName}</Label>
              <Input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={100} />
            </div>

            <label className="flex items-center gap-1.5 text-sm">
              {/* Checkbox SEBELUM hidden fallback -- lihat komentar sama di settings-editor.tsx
                  (noIndex), bug & fix-nya identik. Urutan ini WAJIB (FormData.get() ambil
                  entry pertama yang match nama, dites langsung) -- kebalik = checkbox yang
                  dicentang malah kebaca "0". */}
              <input
                type="checkbox"
                name="verifiedBadge"
                value="1"
                key={`verifiedBadge-${profile.verifiedBadge}`}
                defaultChecked={profile.verifiedBadge}
              />
              <input type="hidden" name="verifiedBadge" value="0" />
              {t.settings.verifiedBadgeLabel}
            </label>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bio">{t.settings.bio}</Label>
              <Textarea id="bio" name="bio" defaultValue={profile.bio} maxLength={300} rows={3} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="avatar">{t.settings.avatar}</Label>
              {profile.avatarPath ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- gambar upload sendiri, sudah diproses jadi webp */}
                  <img src={`/uploads/${profile.avatarPath}`} alt="" className="size-16 rounded-full border object-cover" />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" name="removeAvatar" value="1" />
                    {t.settings.removeAvatar}
                  </label>
                </div>
              ) : null}
              <input id="avatar" name="avatar" type="file" accept="image/*" className={FILE_INPUT_CLASS} />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="banner">{t.settings.banner}</Label>
                {/* <details>/<summary> native -- diklik/tap buat buka-tutup (bukan cuma
                    hover), gak butuh client JS sama sekali buat toggle-nya. */}
                <details className="group relative">
                  <summary className="flex cursor-pointer list-none items-center text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                    <Info className="size-3.5" />
                  </summary>
                  <div className="absolute top-full left-0 z-10 mt-1.5 w-64 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
                    {t.settings.bannerSizeHint}
                  </div>
                </details>
              </div>
              <a
                href="/banner-template-1500x500.png"
                download
                className="inline-flex w-fit items-center gap-1 text-xs text-primary hover:underline"
              >
                <Download className="size-3.5" />
                {t.settings.bannerDownloadTemplate}
              </a>
              {profile.bannerPath ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- gambar upload sendiri, sudah diproses jadi webp */}
                  <img src={`/uploads/${profile.bannerPath}`} alt="" className="h-16 w-32 rounded border object-cover" />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" name="removeBanner" value="1" />
                    {t.settings.removeBanner}
                  </label>
                </div>
              ) : null}
              <input id="banner" name="banner" type="file" accept="image/*" className={FILE_INPUT_CLASS} />
            </div>

            <Button type="submit" className="self-start">
              {t.common.save}
            </Button>
          </ActionForm>
        </SectionCard>

        <div className="mt-6">
          <SectionCard title={t.settings.socialIconsLabel}>
            <SocialLinksManager
              pageId={page.id}
              initialTop={socialLinks.top}
              initialBottom={socialLinks.bottom}
              initialShowTop={profile.socialIconsShowTop}
              initialShowBottom={profile.socialIconsShowBottom}
              t={t}
            />
          </SectionCard>
        </div>
      </div>

      <DashboardPreviewPanel tokens={tokens} profile={profile} fallbackName={page.slug} previewBoard={previewBoard} t={t} usePhoneFrame={false} />
    </div>
  );
}
