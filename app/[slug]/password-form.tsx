"use client";

import { useActionState } from "react";
import { unlockPage } from "./password-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicDictionary, type PublicLocale } from "@/lib/public-i18n";

// Sebelumnya SELALU Indonesia hardcoded apapun bahasa browser pengunjungnya -- padahal
// halaman publik lain (badge live, toast copy, dll) udah ngikut Accept-Language lewat
// lib/public-i18n.ts. Ini satu-satunya bagian halaman publik yang ketinggalan.
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

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{pt.pageProtectedTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{pt.passwordLabel}</Label>
              <Input id="password" name="password" type="password" required autoFocus />
            </div>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? pt.checkingLabel : pt.unlockSubmitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
