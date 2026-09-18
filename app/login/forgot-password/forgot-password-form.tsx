"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Dictionary, Locale } from "@/lib/i18n";

export function ForgotPasswordForm({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset.bind(null, locale), undefined);

  if (state?.sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t.forgotPassword.sentTitle}</CardTitle>
          <CardDescription>{t.forgotPassword.sentDesc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <code className="block rounded-lg bg-muted p-3 font-mono text-xs break-all">{t.forgotPassword.sentCommand}</code>
          <p className="text-xs text-muted-foreground">{t.forgotPassword.sentHint}</p>
          <Link href="/login/reset-password">
            <Button type="button" className="w-full">
              {t.forgotPassword.continueButton}
            </Button>
          </Link>
          <Link href="/login" className="text-center text-sm text-muted-foreground underline hover:text-foreground">
            {t.forgotPassword.backToLogin}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t.forgotPassword.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">{t.forgotPassword.username}</Label>
            <Input id="username" name="username" type="text" required autoFocus autoComplete="username" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? t.forgotPassword.submitting : t.forgotPassword.submit}
          </Button>
          <Link href="/login" className="text-center text-sm text-muted-foreground underline hover:text-foreground">
            {t.forgotPassword.backToLogin}
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
