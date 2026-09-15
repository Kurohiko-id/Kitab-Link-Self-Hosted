"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { setCustomDomainAction, type SetCustomDomainState } from "./page-actions";
import type { Dictionary, Locale } from "@/lib/i18n";

export function DomainForm({
  page,
  t,
  locale,
}: {
  page: { id: number; domainType: string; domainValue: string | null; domainVerified: boolean };
  t: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [state, formAction, pending] = useActionState<SetCustomDomainState, FormData>(
    setCustomDomainAction.bind(null, locale, page.id),
    undefined,
  );

  // Panggil action LANGSUNG dengan FormData kosong dikonstruksi manual -- bukan ngosongin
  // <Input> lewat DOM (`input.value = ""`) terus ngandelin form submission asli baca ulang
  // value-nya. Itu KEMUNGKINAN jalan (submit event emang fire setelah click, FormData baca
  // DOM live), tapi gak ada gunanya gantungin ke urutan event kalau bisa lebih pasti dengan
  // manggil action-nya sendiri.
  async function handleRemove() {
    setRemoving(true);
    try {
      await setCustomDomainAction(locale, page.id, undefined, new FormData());
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  // Field uncontrolled (defaultValue) -- tanpa refresh manual, React 19 nge-reset field ke
  // nilai LAMA sesaat abis submit sukses (lihat komentar di components/action-form.tsx),
  // padahal domain BARU yang barusan disimpen harusnya tetep ketampil.
  useEffect(() => {
    if (state && !state.error) router.refresh();
  }, [state, router]);

  const hasDomain = page.domainType === "custom_domain" && page.domainValue;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {hasDomain ? (
        <div className="flex items-center gap-2">
          <Badge variant={page.domainVerified ? "sage" : "amber"}>
            {page.domainVerified ? t.domain.verifiedBadge : t.domain.pendingBadge}
          </Badge>
          <span className="text-sm font-medium">{page.domainValue}</span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="domain">{t.domain.domainFieldLabel}</Label>
        <Input
          id="domain"
          name="domain"
          defaultValue={page.domainValue ?? ""}
          placeholder="links.contohdomain.com"
          autoComplete="off"
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
        {/* Tombol hapus eksplisit -- sebelumnya satu-satunya cara lepas domain itu ngosongin
            field lalu Simpan, dan itu cuma dijelasin lewat label. */}
        {hasDomain ? (
          <Button type="button" variant="outline" disabled={removing || pending} onClick={handleRemove}>
            {removing ? t.common.saving : t.domain.removeDomainButton}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
