"use client";

import { useActionState } from "react";
import { login, verifyTotpLoginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Dictionary, Locale } from "@/lib/i18n";

export function LoginForm({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [state, formAction, pending] = useActionState(login.bind(null, locale), undefined);
  const [totpState, totpFormAction, totpPending] = useActionState(verifyTotpLoginAction.bind(null, locale), undefined);

  if (state?.needsTotp) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.login.totpTitle}</CardTitle>
          <CardDescription>{t.login.totpDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={totpFormAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">{t.login.totpCodeLabel}</Label>
              {/* Gak dikunci numerik -- field ini nerima kode 6 digit ATAU backup code hex.
                  autoCapitalize/spellCheck dimatiin: backup code itu hex huruf kecil, kalau
                  ke-autocapitalize HP jadi gak match. */}
              <Input
                id="code"
                name="code"
                required
                autoFocus
                autoComplete="one-time-code"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={10}
              />
            </div>
            {totpState?.error && <p className="text-sm text-destructive">{totpState.error}</p>}
            <Button type="submit" disabled={totpPending}>
              {totpPending ? t.login.submitting : t.login.submit}
            </Button>
            {/* Tanpa ini, step TOTP = jalan buntu: `needsTotp` cuma berubah kalau action
                login dipanggil ulang, jadi pas cookie pending (5 menit) kedaluwarsa user
                kejebak di form kode tanpa cara balik selain reload manual. */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-center text-sm text-muted-foreground underline hover:text-foreground"
            >
              {t.login.backToLogin}
            </button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t.login.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t.login.email}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t.login.password}</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? t.login.submitting : t.login.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
