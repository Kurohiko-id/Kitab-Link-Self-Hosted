"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Dictionary, Locale } from "@/lib/i18n";

export function ResetPasswordForm({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction.bind(null, locale), undefined);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t.resetPassword.title}</CardTitle>
        <CardDescription>{t.resetPassword.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t.resetPassword.email}</Label>
            <Input id="email" name="email" type="email" required autoFocus autoComplete="email" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="token">{t.resetPassword.tokenLabel}</Label>
            {/* autoCapitalize/autoCorrect/spellCheck dimatiin -- token hex huruf kecil,
                dicocokin case-sensitive, sama pola kayak app/setup/setup-form.tsx. */}
            <Input
              id="token"
              name="token"
              required
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">{t.resetPassword.tokenHint}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t.resetPassword.newPassword}</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? t.resetPassword.submitting : t.resetPassword.submit}
          </Button>
          <Link href="/login" className="text-center text-sm text-muted-foreground underline hover:text-foreground">
            {t.resetPassword.backToLogin}
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
