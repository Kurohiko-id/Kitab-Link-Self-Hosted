"use client";

import { useActionState, useState } from "react";
import { Lock, KeyRound, Eye, EyeOff, ArrowRight, CircleAlert } from "lucide-react";
import { unlockPage } from "./password-actions";
import { getPublicDictionary, type PublicLocale } from "@/lib/public-i18n";

// Redesign atas permintaan user (referensi mockup HTML) -- pakai token warna sistem desain
// sendiri (bg-primary, bg-card, dst, bukan hardcode indigo/slate) biar otomatis konsisten
// sama dashboard + ngikut dark mode. Font gak di-set di sini sama sekali -- udah ke-inherit
// dari <body> (font Inter dari app/layout.tsx, sama kayak seluruh app).
export function PasswordForm({
  pageId,
  redirectTo,
  locale,
}: {
  pageId: number;
  redirectTo: string;
  locale: PublicLocale;
}) {
  const pt = getPublicDictionary(locale);
  const [state, formAction, pending] = useActionState(unlockPage.bind(null, pageId, redirectTo, locale), undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 to-muted p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 p-6 shadow-xl backdrop-blur sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{pt.pageProtectedTitle}</h1>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {pt.passwordLabel}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <KeyRound className="size-4" />
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                placeholder={pt.passwordFieldPlaceholder}
                className="w-full rounded-xl border border-input bg-muted/40 py-3 pr-10 pl-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {state?.error ? (
            <p className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 py-2 text-center text-xs font-medium text-destructive">
              <CircleAlert className="size-3.5 shrink-0" /> {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
          >
            <span>{pending ? pt.checkingLabel : pt.unlockSubmitLabel}</span>
            <ArrowRight className="size-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
