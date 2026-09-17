"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { Badge } from "@/components/ui/badge";
import { LinkIconRenderer } from "@/components/link-icon";
import { cn } from "@/lib/utils";
import { parseProfileData } from "@/lib/profile";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { LatestRelease } from "@/lib/update-check";
import { saveProfileAction, changePasswordAction, type ChangePasswordState } from "./settings-actions";
import { ActionForm } from "@/components/action-form";
import { exportPageDataAction, importPageDataAction } from "./backup-actions";
import { deletePageAction, setPrimaryPageAction, setPagePassword } from "./page-actions";
import { createTempAccessAction, revokeTempAccessAction } from "../[slug]/password-actions";
import { SectionCard } from "./section-card";
import { TotpSettings } from "./totp-settings";
import { PreviewLinkManager } from "@/components/preview-link-manager";

const GITHUB_URL = "https://github.com/Kurohiko-id/Kitab-Link-Self-Hosted";
const SAWERIA_URL = "https://saweria.co/Kurohiko";

// Sama kayak file input di link-form-modal.tsx/theme-editor.tsx -- default browser buat
// tombol "Choose file" nyaru sama background, jadi selalu dikasih file: classes ini.
const FILE_INPUT_CLASS =
  "text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground";

type Tab = "page" | "seo" | "security" | "css" | "backup" | "danger" | "about";
export type AccessCode = { id: number; label: string | null; expiresAt: Date; createdAt: Date; expired: boolean };

export function SettingsEditor({
  page,
  isPrimaryPage,
  accessCodes,
  totpEnabled,
  totpBackupCodesRemaining,
  previewLinkActive,
  version,
  availableUpdate,
  t,
  locale,
}: {
  page: { id: number; slug: string; profileJson: string; passwordHash: string | null };
  isPrimaryPage: boolean;
  accessCodes: AccessCode[];
  totpEnabled: boolean;
  totpBackupCodesRemaining: number;
  previewLinkActive: boolean;
  version: string;
  availableUpdate: LatestRelease | null;
  t: Dictionary;
  locale: Locale;
}) {
  const [tab, setTab] = useState<Tab>("page");
  const profile = parseProfileData(page.profileJson);

  const TAB_LABELS: Record<Tab, string> = {
    page: t.settings.pageTabLabel,
    seo: t.settings.seoTabLabel,
    security: t.settings.securityTabLabel,
    css: t.settings.cssTabLabel,
    backup: t.settings.backupTabLabel,
    danger: t.settings.dangerTabLabel,
    about: t.settings.aboutTabLabel,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1.5 shadow-sm">
        {(["page", "seo", "security", "css", "backup", "danger", "about"] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === tabKey
                ? tabKey === "danger"
                  ? "bg-destructive text-white"
                  : "bg-primary text-primary-foreground"
                : tabKey === "danger"
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {TAB_LABELS[tabKey]}
          </button>
        ))}
      </div>

      {tab === "page" ? (
        <PageAccessTab page={page} isPrimaryPage={isPrimaryPage} accessCodes={accessCodes} t={t} locale={locale} />
      ) : null}
      {tab === "seo" ? <SeoTab page={page} profile={profile} t={t} /> : null}
      {tab === "security" ? (
        <SecurityTab
          totpEnabled={totpEnabled}
          totpBackupCodesRemaining={totpBackupCodesRemaining}
          previewLinkActive={previewLinkActive}
          t={t}
          locale={locale}
        />
      ) : null}
      {tab === "css" ? <CustomCssTab page={page} profile={profile} t={t} /> : null}
      {tab === "backup" ? <BackupTab page={page} t={t} /> : null}
      {tab === "danger" ? <DangerZoneTab page={page} t={t} locale={locale} /> : null}
      {tab === "about" ? <AboutTab version={version} availableUpdate={availableUpdate} t={t} /> : null}
    </div>
  );
}

// Delegasi ke SectionCard yang dipakai di seluruh dashboard lain, biar radius/shadow/warna
// card di sini gak nge-drift sendiri -- cuma nyocokin nama prop lama (title/desc) di file ini.
function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <SectionCard title={title} description={desc}>
      {children}
    </SectionCard>
  );
}

const DURATION_OPTIONS: { hours: number; labelKey: keyof Dictionary["settings"] }[] = [
  { hours: 3, labelKey: "tempAccessDuration3h" },
  { hours: 12, labelKey: "tempAccessDuration12h" },
  { hours: 24, labelKey: "tempAccessDuration1d" },
  { hours: 72, labelKey: "tempAccessDuration3d" },
  { hours: 168, labelKey: "tempAccessDuration7d" },
  { hours: 720, labelKey: "tempAccessDuration30d" },
];

function TempAccessCreator({ pageId, t, locale }: { pageId: number; t: Dictionary; locale: Locale }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate() {
    setPending(true);
    setError(null);
    const result = await createTempAccessAction(locale, pageId, code, hours, label);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setCode("");
    setLabel("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="tempCode">{t.settings.tempAccessCodeLabel}</Label>
          <Input
            id="tempCode"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t.settings.tempAccessCodePlaceholder}
            className="bg-background"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tempDuration">{t.settings.tempAccessDurationLabel}</Label>
          <SelectField
            id="tempDuration"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="bg-background"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.hours} value={opt.hours}>
                {t.settings[opt.labelKey]}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="tempLabel">{t.settings.tempAccessLabelLabel}</Label>
          <Input
            id="tempLabel"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t.settings.tempAccessLabelPlaceholder}
            className="bg-background"
          />
        </div>
        <Button type="button" size="sm" disabled={pending || code.trim().length < 4} onClick={handleCreate}>
          {pending ? t.common.saving : t.settings.tempAccessCreate}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function TempAccessList({ pageId, codes, t, locale }: { pageId: number; codes: AccessCode[]; t: Dictionary; locale: Locale }) {
  const router = useRouter();
  const dateLocale = locale === "en" ? "en-US" : "id-ID";

  async function handleRevoke(codeId: number) {
    await revokeTempAccessAction(pageId, codeId);
    router.refresh();
  }

  if (codes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.settings.tempAccessEmpty}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {codes.map((accessCode) => {
        const expired = accessCode.expired;
        return (
          <li key={accessCode.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <div>
              <div className="font-medium">{accessCode.label || t.settings.tempAccessNoLabel}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {expired ? (
                  <Badge variant="amber">{t.settings.tempAccessExpired}</Badge>
                ) : (
                  <Badge variant="sage">{t.settings.tempAccessActive}</Badge>
                )}
                <span>
                  {t.settings.tempAccessExpiresAt} {accessCode.expiresAt.toLocaleString(dateLocale)}
                </span>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => handleRevoke(accessCode.id)}>
              {t.settings.tempAccessRevoke}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function PageAccessTab({
  page,
  isPrimaryPage,
  accessCodes,
  t,
  locale,
}: {
  page: { id: number; slug: string; passwordHash: string | null };
  isPrimaryPage: boolean;
  accessCodes: AccessCode[];
  t: Dictionary;
  locale: Locale;
}) {
  const isProtected = !!page.passwordHash;

  return (
    <div className="flex flex-col gap-6">
      <Card title={t.domain.primaryPageTitle} desc={isPrimaryPage ? t.domain.primaryPageActiveDesc : t.domain.primaryPageInactiveDesc}>
        <form action={setPrimaryPageAction.bind(null, isPrimaryPage ? null : page.id)}>
          <Button type="submit" variant={isPrimaryPage ? "outline" : "default"}>
            {isPrimaryPage ? t.domain.primaryPageUnset : t.domain.primaryPageSet}
          </Button>
        </form>
      </Card>

      <Card
        title={t.domain.passwordTitle}
        desc={isProtected ? t.domain.passwordProtectedDesc : t.domain.passwordPublicDesc}
      >
        <form action={setPagePassword.bind(null, page.id)} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="password">{isProtected ? t.domain.changePassword : t.domain.setPassword}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={4}
              autoComplete="new-password"
              placeholder={t.domain.passwordPlaceholder}
            />
          </div>
          <Button type="submit">{isProtected ? t.domain.update : t.domain.activate}</Button>
        </form>
      </Card>

      <Card title={t.settings.tempAccessTitle} desc={t.settings.tempAccessDesc}>
        <div className="flex flex-col gap-3">
          <TempAccessCreator pageId={page.id} t={t} locale={locale} />
          <TempAccessList pageId={page.id} codes={accessCodes} t={t} locale={locale} />
        </div>
      </Card>
    </div>
  );
}

function SeoTab({
  page,
  profile,
  t,
}: {
  page: { id: number; slug: string };
  profile: ReturnType<typeof parseProfileData>;
  t: Dictionary;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card title={t.settings.seoSectionTitle} desc={t.settings.seoDesc}>
        <ActionForm errorMessage={t.common.saveFailed} action={saveProfileAction.bind(null, page.id)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seoTitle">{t.settings.seoTitleLabel}</Label>
            <Input
              id="seoTitle"
              name="seoTitle"
              defaultValue={profile.seoTitle}
              maxLength={100}
              placeholder={profile.displayName || `@${page.slug}`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seoDescription">{t.settings.seoDescriptionLabel}</Label>
            <Textarea
              id="seoDescription"
              name="seoDescription"
              defaultValue={profile.seoDescription}
              maxLength={200}
              rows={2}
              placeholder={profile.bio || t.settings.seoDescriptionPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ogImage">{t.settings.ogImage}</Label>
            <p className="text-xs text-muted-foreground">{t.settings.ogImageHint}</p>
            {profile.ogImagePath ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- gambar upload sendiri, sudah diproses jadi webp */}
                <img
                  src={`/uploads/${profile.ogImagePath}`}
                  alt=""
                  className="h-20 w-[152px] rounded border object-cover"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" name="removeOgImage" value="1" />
                  {t.settings.removeOgImage}
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={`/${page.slug}/og`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-20 w-[152px] shrink-0 overflow-hidden rounded border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- preview gambar auto-generate, bukan aset lokal statis */}
                  <img src={`/${page.slug}/og`} alt="" className="size-full object-cover" />
                </a>
                <p className="text-xs text-muted-foreground">{t.settings.ogImageAuto}</p>
              </div>
            )}
            <input id="ogImage" name="ogImage" type="file" accept="image/*" className={FILE_INPUT_CLASS} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="footerText">{t.settings.footerTextLabel}</Label>
            <p className="text-xs text-muted-foreground">{t.settings.footerTextHint}</p>
            <Input id="footerText" name="footerText" defaultValue={profile.footerText} maxLength={200} />
          </div>

          <label className="flex items-center gap-1.5 text-sm">
            {/* Checkbox SEBELUM hidden fallback, TANPA `key` -- pola sama persis kayak
                noIndex/verifiedBadge di bawah, lihat komentar lengkapnya di situ. */}
            <input type="checkbox" name="watermarkEnabled" value="1" defaultChecked={profile.watermarkEnabled} />
            <input type="hidden" name="watermarkEnabled" value="0" />
            {t.settings.watermarkLabel}
          </label>
          <p className="-mt-3 text-xs text-muted-foreground">{t.settings.watermarkHint}</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="privacyPolicyContent">{t.settings.privacyPolicyLabel}</Label>
            <p className="text-xs text-muted-foreground">
              {t.settings.privacyPolicyHint} <code>/{page.slug}/privacy</code>.
            </p>
            <Textarea
              id="privacyPolicyContent"
              name="privacyPolicyContent"
              rows={8}
              defaultValue={profile.privacyPolicyContent}
              maxLength={20000}
              placeholder={t.settings.privacyPolicyPlaceholder}
            />
          </div>

          <label className="flex items-center gap-1.5 text-sm">
            {/* Checkbox SEBELUM hidden fallback -- FormData.get() ambil entry PERTAMA yang
                match nama (dites langsung, bukan asumsi). Checked: browser kirim checkbox
                ("1") + hidden ("0") dua-duanya, get() ambil punya checkbox duluan -> "1".
                Unchecked: checkbox gak ikut kekirim SAMA SEKALI (bukan value="0", browser
                emang gitu), tinggal hidden doang -> "0". Tanpa hidden ini, formData.has()
                gak bisa bedain "field emang gak ada di form ini" (form lain di halaman
                Settings/SEO) vs "user sengaja uncheck" -- settings-actions.ts butuh dua-duanya
                kebedain.

                SENGAJA gak dikasih `key` biar gak remount abis save -- checked state yang
                keliatan di layar itu udah PERSIS klik user sendiri, sama kayak yang kesimpen,
                jadi gak butuh "refresh paksa" (pernah dicoba, malah bikin checkbox-nya kedip
                bongkar-pasang pas revalidate). */}
            <input type="checkbox" name="noIndex" value="1" defaultChecked={profile.noIndex} />
            <input type="hidden" name="noIndex" value="0" />
            {t.settings.noIndexLabel}
          </label>
          <p className="-mt-3 text-xs text-muted-foreground">{t.settings.noIndexHint}</p>

          <Button type="submit" className="self-start">
            {t.common.save}
          </Button>
        </ActionForm>
      </Card>

      <Card title={t.settings.faviconTitle}>
        <ActionForm errorMessage={t.common.saveFailed} action={saveProfileAction.bind(null, page.id)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="favicon">{t.settings.faviconLabel}</Label>
            <p className="text-xs text-muted-foreground">{t.settings.faviconHint}</p>
            {profile.faviconPath ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- favicon upload sendiri */}
                <img src={`/uploads/${profile.faviconPath}`} alt="" className="size-10 rounded border object-cover" />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" name="removeFavicon" value="1" />
                  {t.settings.removeFavicon}
                </label>
              </div>
            ) : null}
            <input id="favicon" name="favicon" type="file" accept="image/*" className={FILE_INPUT_CLASS} />
          </div>
          <Button type="submit" className="self-start">
            {t.common.save}
          </Button>
        </ActionForm>
      </Card>
    </div>
  );
}

function SecurityTab({
  totpEnabled,
  totpBackupCodesRemaining,
  previewLinkActive,
  t,
  locale,
}: {
  totpEnabled: boolean;
  totpBackupCodesRemaining: number;
  previewLinkActive: boolean;
  t: Dictionary;
  locale: Locale;
}) {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction.bind(null, locale),
    undefined,
  );

  return (
    <div className="flex flex-col gap-6">
      <Card title={t.settings.securityTitle} desc={t.settings.securityDesc}>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">{t.settings.currentPasswordLabel}</Label>
            <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">{t.settings.newPasswordLabel}</Label>
            <Input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state?.success ? <p className="text-sm text-emerald-600">{t.settings.passwordChangedSuccess}</p> : null}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? t.common.saving : t.settings.changePasswordButton}
          </Button>
        </form>
      </Card>
      <Card title={t.settings.totpTitle} desc={t.settings.totpDesc}>
        <TotpSettings enabled={totpEnabled} backupCodesRemaining={totpBackupCodesRemaining} t={t} locale={locale} />
      </Card>
      <Card title={t.settings.previewLinkTitle} desc={t.settings.previewLinkDesc}>
        <PreviewLinkManager initialActive={previewLinkActive} t={t} />
      </Card>
    </div>
  );
}

function CustomCssTab({
  page,
  profile,
  t,
}: {
  page: { id: number };
  profile: ReturnType<typeof parseProfileData>;
  t: Dictionary;
}) {
  return (
    <Card title={t.settings.cssTitle} desc={t.settings.cssDesc}>
      <ActionForm errorMessage={t.common.saveFailed} action={saveProfileAction.bind(null, page.id)} className="flex flex-col gap-3">
        <Textarea
          name="customCss"
          defaultValue={profile.customCss}
          rows={12}
          placeholder={t.settings.cssPlaceholder}
          className="font-mono text-xs"
        />
        <Button type="submit" className="self-start">
          {t.common.save}
        </Button>
      </ActionForm>
    </Card>
  );
}

function BackupTab({ page, t }: { page: { id: number }; t: Dictionary }) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleExport() {
    const data = await exportPageDataAction(page.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.slug || "kitab-link"}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!importFile) return;
    setPending(true);
    setMessage(null);
    const text = await importFile.text();
    const result = await importPageDataAction(page.id, text);
    setPending(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "success", text: t.settings.importSuccess });
    setImportFile(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card title={t.settings.backupTitle} desc={t.settings.backupDesc}>
        <Button type="button" variant="outline" onClick={handleExport}>
          {t.settings.exportButton}
        </Button>
      </Card>

      <Card title={t.settings.importLabel}>
        <div className="flex flex-col gap-3">
          <p className="rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
            {t.settings.importWarning}
          </p>
          <input
            type="file"
            accept="application/json"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className={FILE_INPUT_CLASS}
          />
          {message ? (
            <p className={cn("text-sm", message.type === "error" ? "text-destructive" : "text-emerald-600")}>
              {message.text}
            </p>
          ) : null}
          <Button type="button" variant="outline" disabled={!importFile || pending} onClick={handleImport} className="self-start">
            {pending ? t.common.saving : t.settings.importButton}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function DangerZoneTab({
  page,
  t,
  locale,
}: {
  page: { id: number; slug: string };
  t: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const [wordInput, setWordInput] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Case-sensitive persis (bukan .toLowerCase()) -- disengaja sesuai request: user harus
  // ngetik ulang nama page-nya PERSIS, termasuk huruf besar/kecil, biar gak asal klik.
  const canDelete = wordInput === t.settings.dangerConfirmWord && slugInput === page.slug;

  async function handleDelete() {
    if (!canDelete) return;
    setPending(true);
    setError(null);
    const result = await deletePageAction(locale, page.id);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-destructive">{t.settings.dangerTitle}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t.settings.dangerDesc}</p>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dangerWord">{t.settings.dangerTypeWordLabel}</Label>
          <Input
            id="dangerWord"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            placeholder={t.settings.dangerConfirmWord}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dangerSlug">
            {t.settings.dangerTypeSlugLabel.replace("{slug}", page.slug)}
          </Label>
          <Input
            id="dangerSlug"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder={page.slug}
            autoComplete="off"
            className="font-mono"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          type="button"
          disabled={!canDelete || pending}
          onClick={handleDelete}
          className="self-start bg-destructive text-white hover:bg-destructive/90"
        >
          {pending ? t.common.saving : t.settings.dangerDeleteButton}
        </Button>
      </div>
    </div>
  );
}

// Dulu modal terpisah (about-dialog.tsx, tombol di footer sidebar) -- dipindah jadi tab di
// sini atas permintaan user, biar nyatu sama Settings lain (bukan aksi level aplikasi yang
// nyelip sendirian di footer).
function AboutTab({ version, availableUpdate, t }: { version: string; availableUpdate: LatestRelease | null; t: Dictionary }) {
  return (
    <Card title={t.about.title}>
      <div className="flex flex-col items-center gap-2 pb-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo statis kecil, bukan kandidat next/image */}
        <img src="/logo.png" alt="" className="size-14 rounded-2xl shadow-sm" />
        <h2 className="text-base font-semibold">Kitab Link</h2>
        <p className="text-sm text-muted-foreground">{t.about.tagline}</p>
      </div>

      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <span className="text-muted-foreground">{t.about.version}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">v{version}</span>
            {availableUpdate ? (
              <Badge variant="amber">{t.about.updateAvailable}</Badge>
            ) : (
              <Badge variant="sage">{t.about.upToDate}</Badge>
            )}
          </div>
        </div>

        {availableUpdate ? (
          <a
            href={availableUpdate.url}
            target="_blank"
            rel="noopener noreferrer"
            className="-mt-1 text-xs text-primary hover:underline"
          >
            v{availableUpdate.version} -- {t.about.viewChangelog}
          </a>
        ) : null}

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted"
        >
          <span className="flex items-center gap-2">
            <LinkIconRenderer value="brand:github" className="size-4" /> {t.about.sourceCode}
          </span>
          <ExternalLink className="size-3.5 text-muted-foreground" />
        </a>

        <div className="rounded-lg border px-3 py-2.5">
          <p className="text-xs text-muted-foreground">{t.about.owner}</p>
          <p className="font-medium">Kurohiko</p>
        </div>

        <a
          href={SAWERIA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Heart className="size-4" /> {t.about.donate}
        </a>
      </div>
    </Card>
  );
}
