"use client";

import { useActionState } from "react";
import { setupFirstAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Dictionary, Locale } from "@/lib/i18n";

export function SetupForm({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [state, formAction, pending] = useActionState(setupFirstAdmin.bind(null, locale), undefined);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t.setup.title}</CardTitle>
        <CardDescription>{t.setup.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="token">{t.setup.tokenLabel}</Label>
            {/* autoCapitalize/autoCorrect/spellCheck dimatiin -- token itu hex huruf kecil
                dan dicocokin case-sensitive; keyboard HP default nge-kapitalin huruf pertama,
                jadi user yang ngetik/paste bener tetep dapet "Token setup salah". */}
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
            <p className="text-xs text-muted-foreground">{t.setup.tokenHint}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t.setup.email}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t.setup.password}</Label>
            <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? t.setup.submitting : t.setup.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
