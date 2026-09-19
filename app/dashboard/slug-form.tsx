"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeSlugAction, type ChangeSlugState } from "./page-actions";
import type { Dictionary, Locale } from "@/lib/i18n";

export function SlugForm({ page, t, locale }: { page: { id: number; slug: string }; t: Dictionary; locale: Locale }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ChangeSlugState, FormData>(
    changeSlugAction.bind(null, locale, page.id),
    undefined,
  );

  // Field uncontrolled (defaultValue) -- sama alasannya kayak DomainForm, tanpa refresh
  // manual React 19 nge-reset field ke slug LAMA sesaat abis submit sukses.
  useEffect(() => {
    if (state && !state.error) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">{t.settings.slugFieldLabel}</Label>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">/</span>
          <Input id="slug" name="slug" defaultValue={page.slug} placeholder="kitabalamak" autoComplete="off" className="font-mono" />
        </div>
        <p className="text-xs text-muted-foreground">{t.settings.slugHint}</p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t.common.saving : t.common.save}
      </Button>
    </form>
  );
}
