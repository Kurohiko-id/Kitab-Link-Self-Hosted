"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";
import { generatePreviewLinkAction, revokePreviewLinkAction } from "@/app/dashboard/settings-actions";

// Raw token cuma pernah balik sekali (pas baru di-generate/regenerate) -- sama kayak
// TokenCreator (API token). Abis reload halaman, kita cuma tau "ada link aktif apa
// nggak" (initialActive), bukan isi link-nya lagi -- itu prinsip token di-hash di DB.
export function PreviewLinkManager({ initialActive, t }: { initialActive: boolean; t: Dictionary }) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleGenerate() {
    setPending(true);
    const token = await generatePreviewLinkAction();
    setNewToken(token);
    setActive(true);
    setPending(false);
    router.refresh();
  }

  async function handleRevoke() {
    setPending(true);
    await revokePreviewLinkAction();
    setNewToken(null);
    setActive(false);
    setPending(false);
    router.refresh();
  }

  if (newToken) {
    const url = `${window.location.origin}/dashboard/preview/${newToken}`;
    return (
      <div className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm dark:bg-amber-950">
        <p className="font-medium">{t.settings.previewLinkCreatedNote}</p>
        <code className="mt-1 block break-all rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/10">{url}</code>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(url)}>
            {t.common.copy}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setNewToken(null)}>
            {t.common.done}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {active ? (
        <>
          <span className="text-sm text-muted-foreground">{t.settings.previewLinkActiveNote}</span>
          <Button size="sm" variant="outline" disabled={pending} onClick={handleGenerate}>
            {t.settings.previewLinkRegenerateButton}
          </Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={handleRevoke}>
            {t.settings.previewLinkRevokeButton}
          </Button>
        </>
      ) : (
        <Button size="sm" disabled={pending} onClick={handleGenerate}>
          {t.settings.previewLinkGenerateButton}
        </Button>
      )}
    </div>
  );
}
