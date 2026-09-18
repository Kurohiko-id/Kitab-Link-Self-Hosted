"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CropFileInput } from "@/components/crop-file-input";
import { updateAccountAction } from "@/app/dashboard/settings-actions";
import type { Dictionary, Locale } from "@/lib/i18n";

const FILE_INPUT_CLASS =
  "text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground";

// Sidebar row cuma nampilin avatar + nama (KOSMETIK, aman keliatan orang lewat) -- klik
// buat buka popup, semua editan (avatar/nama/username) dan reveal username ada di dalem situ.
export function SidebarAccount({
  displayName,
  username,
  avatarPath,
  locale,
  t,
}: {
  displayName: string | null;
  username: string;
  avatarPath: string | null;
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [usernameValue, setUsernameValue] = useState(username);
  const [displayNameValue, setDisplayNameValue] = useState(displayName ?? "");
  // Step "confirm" -- BUKAN cuma UI, ini yang beneran nyelesain bug password manager
  // (ProtonPass dkk) nimpa field username: begitu user ganti username, form step 1
  // (avatar/nama/username) di-UNMOUNT total sebelum field password step 2 dirender. Field
  // "kayak username" dan field password gak PERNAH ada bareng di DOM yang sama, jadi gak
  // ada apa pun buat di-pairing-in autofill-nya -- lebih robust daripada decoy field/
  // autocomplete="off" doang (udah dicoba, password manager modern tetep nembus itu).
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const shownName = displayName || username;

  function handleOpen() {
    setUsernameValue(username);
    setDisplayNameValue(displayName ?? "");
    setShowUsername(false);
    setError(undefined);
    setStep("edit");
    setPendingFormData(null);
    setOpen(true);
  }

  async function submit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const result = await updateAccountAction(locale, undefined, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUsername = String(formData.get("username") ?? "").trim().toLowerCase();
    if (newUsername !== username) {
      setPendingFormData(formData);
      setStep("confirm");
      return;
    }
    submit(formData);
  }

  async function handleConfirmSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pendingFormData) return;
    const password = String(new FormData(e.currentTarget).get("currentPassword") ?? "");
    pendingFormData.set("currentPassword", password);
    await submit(pendingFormData);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5 text-left"
      >
        {avatarPath ? (
          // eslint-disable-next-line @next/next/no-img-element -- gambar upload sendiri, sudah diproses jadi webp
          <img src={`/uploads/${avatarPath}`} alt="" className="size-8 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {(shownName[0] ?? "?").toUpperCase()}
          </div>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-primary-foreground">{shownName}</span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setShowUsername(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.dashboard.accountDialogTitle}</DialogTitle>
          </DialogHeader>

          {step === "edit" ? (
            <form key={open ? "open" : "closed"} onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {avatarPath ? (
                  // eslint-disable-next-line @next/next/no-img-element -- gambar upload sendiri, sudah diproses jadi webp
                  <img src={`/uploads/${avatarPath}`} alt="" className="size-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                    {(shownName[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <CropFileInput id="account-avatar" name="avatar" aspect={1} round className={FILE_INPUT_CLASS} t={t} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="displayName">{t.dashboard.displayNameLabel}</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={displayNameValue}
                  onChange={(e) => setDisplayNameValue(e.target.value)}
                  maxLength={50}
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="account-username">{t.dashboard.usernameLabel}</Label>
                <div className="relative">
                  <Input
                    id="account-username"
                    name="username"
                    type="text"
                    value={usernameValue}
                    onChange={(e) => setUsernameValue(e.target.value)}
                    required
                    autoComplete="off"
                    className="pr-9"
                    // Tetep type="text" SELAMANYA -- masking visual doang pakai
                    // -webkit-text-security, bukan ganti semantik field jadi type="password".
                    style={showUsername ? undefined : ({ WebkitTextSecurity: "disc" } as React.CSSProperties)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUsername((v) => !v)}
                    title={t.dashboard.revealUsernameHint}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showUsername ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" disabled={pending}>
                {pending ? t.common.saving : t.common.save}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{t.dashboard.confirmPasswordDesc}</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currentPassword">{t.dashboard.currentPasswordLabel}</Label>
                <Input id="currentPassword" name="currentPassword" type="password" required autoFocus autoComplete="off" />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("edit");
                    setError(undefined);
                  }}
                >
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={pending} className="flex-1">
                  {pending ? t.common.saving : t.common.save}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
