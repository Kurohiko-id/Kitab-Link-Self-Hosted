"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  startTotpEnrollment,
  confirmTotpEnrollment,
  disableTotpAction,
  regenerateBackupCodesAction,
  type ConfirmTotpState,
  type DisableTotpState,
} from "./totp-actions";
import type { Dictionary, Locale } from "@/lib/i18n";

type EnrollState = { secret: string; qrDataUrl: string } | null;

export function TotpSettings({
  enabled,
  backupCodesRemaining,
  t,
  locale,
}: {
  enabled: boolean;
  backupCodesRemaining: number;
  t: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const [enroll, setEnroll] = useState<EnrollState>(null);
  const [starting, setStarting] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  const [backupCodesDismissed, setBackupCodesDismissed] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [startError, setStartError] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);
  const [confirmState, confirmAction, confirmPending] = useActionState<ConfirmTotpState, FormData>(
    confirmTotpEnrollment.bind(null, locale),
    undefined,
  );
  const [disableState, disableAction, disablePending] = useActionState<DisableTotpState, FormData>(
    disableTotpAction.bind(null, locale),
    undefined,
  );
  const disableSucceeded = disableState !== undefined && !disableState.error;
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  // Jalur regenerate SENGAJA gak pakai useActionState, beda dari confirm/disable. Alasannya:
  // state useActionState itu "sticky" (gak bisa di-reset manual, cuma berubah kalau action-nya
  // dipanggil lagi), dan itu udah 3x jadi sumber bug di komponen ini. Buat regenerate kita
  // butuh kontrol penuh: kapan kode ditampilin, kapan dibuang. Jadi hasilnya ditaruh di state
  // lokal biasa yang bisa di-set/clear kapan aja -- pola sama kayak startTotpEnrollment di atas.
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regeneratePending, setRegeneratePending] = useState(false);

  async function handleRegenerate(formData: FormData) {
    setRegeneratePending(true);
    setRegenerateError(null);
    try {
      const result = await regenerateBackupCodesAction(locale, undefined, formData);
      if (result?.error) {
        setRegenerateError(result.error);
        return;
      }
      if (result?.backupCodes) {
        setRegeneratedCodes(result.backupCodes);
        setBackupCodesDismissed(false);
        setConfirmWord("");
        setCodesCopied(false);
        setRegenerateDialogOpen(false);
      }
    } catch {
      setRegenerateError(t.settings.totpStartError);
    } finally {
      setRegeneratePending(false);
    }
  }

  // `confirmState` sticky selamanya abis enroll pertama. Pas user enroll ULANG (abis disable),
  // handleStart nge-reset dismissed=false -- tanpa penjaga ini, kode enrollment LAMA yang masih
  // nyangkut di confirmState langsung nongol sebelum user sempet scan QR, dan kode itu udah
  // gak valid. Jadi pas mulai enroll, nilai confirmState saat itu ditandain "basi"; cuma array
  // dengan identitas BARU (useActionState selalu balikin objek baru tiap action selesai) yang
  // dianggap hasil enrollment sekarang.
  const [staleConfirmCodes, setStaleConfirmCodes] = useState<string[] | undefined>(undefined);
  const freshConfirmCodes =
    confirmState?.backupCodes && confirmState.backupCodes !== staleConfirmCodes ? confirmState.backupCodes : undefined;

  // Kode hasil regenerate diprioritaskan di atas kode enrollment -- kalau urutannya kebalik,
  // user yang regenerate bakal ditunjukin kode enrollment lama (yang barusan di-invalidate).
  const backupCodesToShow = regeneratedCodes ?? freshConfirmCodes;
  const backupCodesSuccessMessage = regeneratedCodes
    ? t.settings.totpBackupCodesRegeneratedSuccess
    : t.settings.totpEnabledSuccess;

  useEffect(() => {
    // Cuma buat sinkronisasi ke router (sistem eksternal), BUKAN buat nutup dialog -- dialog
    // nutup sendiri karena abis sukses prop `enabled` jadi false, jadi seluruh cabang
    // `if (enabled)` (termasuk <Dialog>-nya) unmount. Sempat dipakai buat nge-derive
    // `open={... && !disableSucceeded}`, tapi itu BUG: disableSucceeded nyangkut true
    // selamanya (useActionState gak bisa di-reset), jadi kalau user nyalain 2FA lagi terus
    // mau matiin lagi, dialog-nya gak pernah kebuka.
    if (disableSucceeded) router.refresh();
  }, [disableSucceeded, router]);

  async function handleStart() {
    // WAJIB reset semua flag "sticky" di sini -- ini satu-satunya pintu masuk alur enroll.
    // Tanpa reset backupCodesDismissed, enrollment KEDUA bakal nge-skip layar backup codes
    // sepenuhnya (flag-nya masih true dari enrollment pertama) -> user punya 2FA aktif tanpa
    // pernah lihat backup code barunya, dan terkunci permanen kalau HP-nya ilang.
    setBackupCodesDismissed(false);
    setRegeneratedCodes(null);
    // Tandain kode enrollment yang ADA SEKARANG sebagai basi -- lihat freshConfirmCodes di atas.
    setStaleConfirmCodes(confirmState?.backupCodes);
    setDisableDialogOpen(false);
    setStartError(false);
    setStarting(true);
    try {
      const result = await startTotpEnrollment();
      setEnroll(result);
    } catch {
      // Tanpa catch, kegagalan di sini cuma bikin spinner berhenti tanpa pesan apa-apa --
      // user ngeklik berulang kali tanpa tau kenapa gagal.
      setStartError(true);
    } finally {
      setStarting(false);
    }
  }

  function handleDone() {
    // useActionState gak punya cara manual buat "reset" confirmState/regenerateState-nya
    // sendiri (cuma berubah kalau action-nya dipanggil ulang) -- makanya butuh flag lokal
    // terpisah ini buat beneran ninggalin layar backup-codes. Tanpa ini, confirmState.
    // backupCodes tetep truthy selamanya, kondisi di bawah tetep ke-trigger, keliatan kayak
    // macet/gak ngapa-ngapain padahal klik-nya sendiri jalan.
    setBackupCodesDismissed(true);
    setEnroll(null);
    setConfirmWord("");
    setRegeneratedCodes(null);
    setRegenerateDialogOpen(false);
    router.refresh();
  }

  // Backup codes cuma kelihatan SEKALI di sini (gak disimpen plaintext di DB) -- begitu
  // "Selesai" diklik, ilang selamanya dari layar, cuma hash-nya yang tersisa di database.
  // Ketik "YES" wajib dulu sebelum tombol Selesai aktif -- friction disengaja, biar user
  // beneran mikir dulu sebelum ngilangin satu-satunya kesempatan liat kode-kode ini.
  if (backupCodesToShow && !backupCodesDismissed) {
    const canDismiss = confirmWord.trim().toUpperCase() === "YES";
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-emerald-600">{backupCodesSuccessMessage}</p>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive">{t.settings.totpBackupCodesWarningTitle}</p>
          <p className="mt-1 text-sm text-destructive/90">{t.settings.totpBackupCodesWarningDesc}</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 rounded-lg border bg-muted/50 p-3 font-mono text-sm">
          {backupCodesToShow.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
        {/* Nyalin 10 kode satu-satu di HP itu nyiksa, padahal layar ini cuma muncul sekali. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(backupCodesToShow!.join("\n"));
              setCodesCopied(true);
            } catch {
              // Clipboard API diblokir (http non-localhost / permission ditolak) -- kodenya
              // tetep kebaca di layar, jadi gak fatal, cukup jangan klaim "tersalin".
            }
          }}
        >
          {codesCopied ? t.settings.totpBackupCodesCopied : t.settings.totpBackupCodesCopy}
        </Button>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmSaved">{t.settings.totpBackupCodesConfirmLabel}</Label>
          <Input
            id="confirmSaved"
            value={confirmWord}
            onChange={(e) => setConfirmWord(e.target.value)}
            placeholder="YES"
            autoComplete="off"
            className="max-w-32"
          />
        </div>
        <Button type="button" onClick={handleDone} disabled={!canDismiss} className="self-start">
          {t.settings.totpBackupCodesDone}
        </Button>
      </div>
    );
  }

  if (enroll) {
    return (
      <form action={confirmAction} className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t.settings.totpScanHint}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- QR code data URL, di-generate sekali per enrollment, bukan aset statis */}
        <img src={enroll.qrDataUrl} alt="QR code TOTP" className="size-40 rounded border" />
        <p className="text-xs break-all text-muted-foreground">{t.settings.totpManualEntryLabel}: {enroll.secret}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="totpCode">{t.settings.totpCodeConfirmLabel}</Label>
          {/* inputMode numeric -- di sini kodenya PASTI 6 digit angka, jadi HP langsung
              kasih keypad angka, bukan keyboard huruf lengkap. (Beda sama field kode di
              halaman login, yang juga nerima backup code hex -- di sana gak boleh dikunci.) */}
          <Input
            id="totpCode"
            name="code"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            className="max-w-32"
          />
        </div>
        {confirmState?.error ? <p className="text-sm text-destructive">{confirmState.error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={confirmPending}>
            {confirmPending ? t.common.saving : t.settings.totpConfirmButton}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEnroll(null)}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    );
  }

  if (enabled) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="sage">{t.settings.totpActiveBadge}</Badge>
          <Button type="button" variant="outline" onClick={() => setDisableDialogOpen(true)}>
            {t.settings.totpDisableButton}
          </Button>
        </div>

        {/* Sebelumnya user gak punya cara tau sisa berapa backup code -- baru ketauan pas
            udah kehabisan (kejebak, gak bisa login). Warna merah kalau tinggal sedikit. */}
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className={backupCodesRemaining <= 2 ? "text-destructive" : "text-muted-foreground"}>
            {t.settings.totpBackupCodesRemainingLabel.replace("{count}", String(backupCodesRemaining))}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => setRegenerateDialogOpen(true)}>
            {t.settings.totpRegenerateButton}
          </Button>
        </div>

        <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <form action={disableAction}>
              <DialogHeader>
                <DialogTitle className="text-destructive">{t.settings.totpDisableConfirmTitle}</DialogTitle>
                <DialogDescription>{t.settings.totpDisableConfirmDesc}</DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex flex-col gap-1.5">
                <Label htmlFor="disableTotpPassword">{t.settings.currentPasswordLabel}</Label>
                <Input id="disableTotpPassword" name="password" type="password" required autoComplete="current-password" />
              </div>
              {disableState?.error ? <p className="mt-2 text-sm text-destructive">{disableState.error}</p> : null}
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDisableDialogOpen(false)}
                  disabled={disablePending}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={disablePending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {disablePending ? t.common.saving : t.settings.totpDisableButton}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Sengaja dialog KEDUA terpisah (bukan reuse dialog disable) -- action-nya beda
            (regenerateBackupCodesAction, bukan disableTotpAction), state pending/error-nya
            juga harus independen biar gak nyampur. */}
        <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <form action={handleRegenerate}>
              <DialogHeader>
                <DialogTitle>{t.settings.totpRegenerateConfirmTitle}</DialogTitle>
                <DialogDescription>{t.settings.totpRegenerateConfirmDesc}</DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex flex-col gap-1.5">
                <Label htmlFor="regenerateTotpPassword">{t.settings.currentPasswordLabel}</Label>
                <Input id="regenerateTotpPassword" name="password" type="password" required autoComplete="current-password" />
              </div>
              {regenerateError ? <p className="mt-2 text-sm text-destructive">{regenerateError}</p> : null}
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRegenerateDialogOpen(false)}
                  disabled={regeneratePending}
                >
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={regeneratePending}>
                  {regeneratePending ? t.common.saving : t.settings.totpRegenerateButton}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={handleStart} disabled={starting} className="self-start">
        {starting ? t.common.saving : t.settings.totpEnableButton}
      </Button>
      {startError ? <p className="text-sm text-destructive">{t.settings.totpStartError}</p> : null}
    </div>
  );
}
